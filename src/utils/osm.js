const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Multiply by Golden Angle (approx 137.5 deg) to separate sequential hashes
    const hue = Math.floor(Math.abs((hash * 137.508) % 360));
    return `hsl(${hue}, 70%, 45%)`; // 45% lightness for better visibility on map
};

export const parseOverpassResponse = (data) => {
    if (!data || !data.elements) return [];

    const nodes = {};
    const ways = {};
    const relations = [];

    // 1. Index all elements
    data.elements.forEach(el => {
        if (el.type === 'node') {
            nodes[el.id] = { pos: [el.lat, el.lon], tags: el.tags };
        } else if (el.type === 'way') {
            ways[el.id] = el.nodes; // Array of node IDs
        } else if (el.type === 'relation') {
            relations.push(el);
        }
    });

    if (relations.length === 0) {
        console.warn("No relations found in Overpass response.");
        return [];
    }

    // Process relations and deduplicate by 'ref' (Line Number)
    const uniqueRefs = new Set();
    const routes = [];

    relations.forEach(relation => {
        const ref = relation.tags.ref;
        if (!ref || uniqueRefs.has(ref)) return; // Skip if already processed this line number

        uniqueRefs.add(ref);

        // Collect all segments first
        const fullPath = [];
        const stops = [];
        const seenStopNames = new Set(); // START: Deduplication by name
        let segments = [];

        relation.members.forEach(member => {
            if (member.type === 'way' && member.role === '') {
                const wayNodeIds = ways[member.ref];
                if (wayNodeIds) {
                    const segmentCoords = [];
                    wayNodeIds.forEach(nodeId => {
                        if (nodes[nodeId]) {
                            segmentCoords.push(nodes[nodeId].pos);
                        }
                    });
                    if (segmentCoords.length > 1) {
                        segments.push(segmentCoords);
                    }
                }
            } else if (member.type === 'node' && (member.role === 'stop' || member.role === 'platform')) {
                if (nodes[member.ref]) {
                    const stopName = nodes[member.ref].tags?.name || "Haltestelle";

                    // Filter: Only allow unique names per line
                    if (!seenStopNames.has(stopName)) {
                        seenStopNames.add(stopName);
                        stops.push({
                            id: member.ref,
                            position: nodes[member.ref].pos,
                            name: stopName,
                            role: member.role
                        });
                    }
                }
            }
        });

        // STITCHING ALGORITHM
        // Reorder segments to form a continuous line where possible.
        if (segments.length > 0) {
            const stitched = [segments[0]]; // Start with first segment
            segments.splice(0, 1); // Remove from pool

            while (segments.length > 0) {
                const head = stitched[0]; // First segment in chain
                const tail = stitched[stitched.length - 1]; // Last segment in chain

                const headPoint = head[0];
                const tailPoint = tail[tail.length - 1];

                let bestMatchIndex = -1;
                let bestMatchAction = null; // 'prepend', 'append', 'prepend_reverse', 'append_reverse'
                let minDist = Infinity;

                // Find best matching segment
                for (let i = 0; i < segments.length; i++) {
                    const seg = segments[i];
                    const start = seg[0];
                    const end = seg[seg.length - 1];

                    // Helper to calc dist squared (approx)
                    const d2 = (p1, p2) => Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2);

                    // Try connecting to Tail
                    const dTailStart = d2(tailPoint, start);
                    const dTailEnd = d2(tailPoint, end);

                    // Try connecting to Head
                    const dHeadStart = d2(headPoint, start);
                    const dHeadEnd = d2(headPoint, end);

                    if (dTailStart < minDist) { minDist = dTailStart; bestMatchIndex = i; bestMatchAction = 'append'; }
                    if (dTailEnd < minDist) { minDist = dTailEnd; bestMatchIndex = i; bestMatchAction = 'append_reverse'; }
                    if (dHeadEnd < minDist) { minDist = dHeadEnd; bestMatchIndex = i; bestMatchAction = 'prepend'; }
                    if (dHeadStart < minDist) { minDist = dHeadStart; bestMatchIndex = i; bestMatchAction = 'prepend_reverse'; }
                }

                // If the closest segment is too far (e.g. > 0.01 degrees ~ 1km), stop or just skip. 
                // For MVP we accept "best effort" to close gaps.
                if (bestMatchIndex !== -1) {
                    const matchedSeg = segments[bestMatchIndex];
                    segments.splice(bestMatchIndex, 1);

                    if (bestMatchAction === 'append') {
                        stitched.push(matchedSeg);
                    } else if (bestMatchAction === 'append_reverse') {
                        stitched.push(matchedSeg.reverse());
                    } else if (bestMatchAction === 'prepend') {
                        stitched.unshift(matchedSeg);
                    } else if (bestMatchAction === 'prepend_reverse') {
                        stitched.unshift(matchedSeg.reverse());
                    }
                } else {
                    // Cannot connect remaining segments, maybe they are disjoint islands.
                    // Just append the next one to allow drawing to continue (with a jump)
                    stitched.push(segments.shift());
                }
            }

            // Flatten matched segments into one path
            stitched.forEach(seg => {
                fullPath.push(...seg);
            });
        }


        // Match stops to closest point on the stitched path
        stops.forEach(stop => {
            let minDist = Infinity;
            let closestIndex = -1;

            fullPath.forEach((coord, idx) => {
                const d = Math.pow(coord[0] - stop.position[0], 2) + Math.pow(coord[1] - stop.position[1], 2);
                if (d < minDist) {
                    minDist = d;
                    closestIndex = idx;
                }
            });
            stop.pathIndex = closestIndex;
        });

        routes.push({
            id: relation.id,
            ref: relation.tags.ref,
            name: relation.tags.name || relation.tags.ref,
            path: fullPath,
            stops: stops,
            color: stringToColor(relation.tags.ref)
        });
    });

    return routes;
};
