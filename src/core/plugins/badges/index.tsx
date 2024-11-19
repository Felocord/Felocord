import { after } from "@lib/api/patcher";
import { onJsxCreate } from "@lib/api/react/jsx";
import { findByName } from "@metro";
import { useEffect, useState } from "react";

import { defineCorePlugin } from "..";

interface FelocordBadge {
    label: string;
    url: string;
}

const useBadgesModule = findByName("useBadges", false);

export default defineCorePlugin({
    manifest: {
        id: "felocord.badges",
        name: "Badges",
        version: "1.0.0",
        description: "Adds badges to user's profile",
        authors: [{ name: "pylixonly" }]
    },
    start() {
        const propHolder = {} as Record<string, any>;
        const badgeCache = {} as Record<string, FelocordBadge[]>;

        onJsxCreate("RenderedBadge", (_, ret) => {
            if (ret.props.id.match(/felocord-\d+-\d+/)) {
                Object.assign(ret.props, propHolder[ret.props.id]);
            }
        });

        after("default", useBadgesModule, ([user], r) => {
            const [badges, setBadges] = useState<FelocordBadge[]>(user ? badgeCache[user.userId] ??= [] : []);

            useEffect(() => {
                if (user) {
                    fetch(`https://raw.githubusercontent.com/felitendo/badges/refs/heads/main/${user.userId}.json`)
                        .then(r => r.json())
                        .then(badges => setBadges(badgeCache[user.userId] = badges));
                }
            }, [user]);

            if (user) {
                badges.forEach((badges, i) => {
                    propHolder[`felocord-${user.userId}-${i}`] = {
                        source: { uri: badges.url },
                        id: `felocord-${i}`,
                        label: badges.label
                    };

                    r.push({
                        id: `felocord-${user.userId}-${i}`,
                        description: badges.label,
                        icon: "_",
                    });
                });
            }
        });
    }
});
