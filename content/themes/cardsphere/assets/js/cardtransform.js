window.jQuery(function ($) {

    cardpeek('body', '.cardpeek');

    var base_url = 'https://www.cardsphere.com';

    var parseDeck = function (text, accumulator) {
        var lines = text.split("\n");
        $.each(lines, function (i, line) {
            var m = /\s*(\d+) (.*)/g.exec(line);
            if (m) {
                accumulator.push(m[2].trim());
            }
        });
    };
    var replaceDeck = function (el, text, resolved) {
        var lines = text.split("\n");
        var main = [];
        var side = [];
        var sublist = main;
        $.each(lines, function (i, line) {
            line = line.trim();
            var m = /\s*(\d+) (.*)/g.exec(line);
            if (m) {
                var c = resolved[m[2].trim()];
                if (c) {
                    sublist.push({
                        quantity: m[1],
                        resolved: c
                    });
                }
            } else if (main.length > 0 && line == "") {
                // switch to filling SB
                sublist = side;
            }
        });
        // broup by type
        var typeGroups = main.reduce(function (r, a) {
            var key = a.resolved.types[a.resolved.types.length - 1]; // last type
            r[key] = r[key] || [];
            r[key].push(a);
            return r;
        }, Object.create(null));

        var $p = $('<p/>', { class: 'decklist' })
        var $main = $('<ul/>', { class: 'decklist-mainboard' }).appendTo($p);
        var $side = $('<ul/>', { class: 'decklist-sideboard' }).appendTo($p);

        var typeOrder = {
            'Planeswalker': 1,
            'Creature': 2,
            'Instant': 3,
            'Sorcery': 4,
            'Enchantment': 5,
            'Artifact': 6,
            'Land': 7,
        }
        var sortedKeys = Object.keys(typeGroups).sort(function (a, b) {
            return typeOrder[a] > typeOrder[b];
        });

        for (var i = 0; i < sortedKeys.length; i++) {
            var groupKey = sortedKeys[i];
            var items = typeGroups[groupKey];
            items.sort(function (a, b) {
                return a.resolved.name > b.resolved.name;
            });
            var $sublist = $('<ul/>', { class: 'decklist-mainboard-sublist decklist-mainboard-' + groupKey.toLocaleLowerCase() }).appendTo($main);
            $.each(items, function (i, item) {
                var $li = $('<li>', { class: 'decklist-card' }).append([
                    $('<span/>', { class: 'decklist-card-quantity' }).text(item.quantity + 'x '),
                    $('<a/>', {
                        href: item.resolved.url,
                        class: 'decklist-card-link cardpeek',
                        'data-image': item.resolved.image,
                    }).text(item.resolved.name)
                ]).appendTo($sublist);
            });
        }
        $.each(side, function (i, item) {
            var $li = $('<li>', { class: 'decklist-card' }).append([
                $('<span/>', { class: 'decklist-card-quantity' }).text(item.quantity + 'x '),
                $('<a/>', {
                    href: item.resolved.url,
                    class: 'decklist-card-link cardpeek',
                    'data-image': item.resolved.image,
                }).text(item.resolved.name)
            ]).appendTo($side);
        });
        $(el).replaceWith($p);
    };
    var replaceCard = function (el, resolved) {
        var c = resolved[el.textContent.trim()];
        if (c) {
            $(el).replaceWith($('<a/>', {
                href: c.url,
                class: 'cardpeek',
                'data-image': c.image,
            }).text(c.name));
        }
    };

    var replaceContent = function (resolved) {
        var $codes = $("code");
        $.each($codes, function (i, code) {
            var isDeck = code.parentElement.nodeName == "PRE";
            if (isDeck) {
                replaceDeck(code.parentElement, code.textContent, resolved);
            } else {
                replaceCard(code, resolved);
            }
        });
    };

    var resolveCards = function () {
        var toResolve = [];
        var $codes = $("code");
        $.each($codes, function (i, code) {
            var isDeck = code.parentElement.nodeName == "PRE";
            if (isDeck) {
                parseDeck(code.textContent, toResolve)
            } else {
                toResolve.push(code.textContent.trim());
            }
        });

        $.ajax(base_url + '/rest/v1/cardinfo/resolve', {
            data: JSON.stringify(toResolve),
            contentType: 'application/json',
            type: 'POST',
        }).done(function (data) {
            var resolved = {};
            for (var i = 0; i < toResolve.length; i++) {
                resolved[toResolve[i]] = data[i]
            }
            replaceContent(resolved);
        });
    };

    resolveCards();

});