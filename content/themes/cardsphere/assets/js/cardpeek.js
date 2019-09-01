window.jQuery(function ($) {

    var cardpeek = function (selector, subselector, extraCheck) {

        var $cardpeekContainer = $('<div/>').addClass('cardpeek-container').hide();
        var $cardpeekBody = $('<div/>').addClass('cardpeek-body').appendTo($cardpeekContainer);
        var $cardpeekImage = $('<img/>').addClass('cardpeek-image').appendTo($cardpeekBody);
        var $cardpeekFooter = $('<div/>').addClass('cardpeek-footer').appendTo($cardpeekContainer);
        var $cardpeekNav = $('<a/>').addClass('cardpeek-nav btn btn-default').appendTo($cardpeekFooter);
        $cardpeekContainer.appendTo($('body'));

        var show = function ($target) {
            var imageUrl = $target.data('image');
            $cardpeekImage.attr('src', '');
            $cardpeekImage.attr('src', imageUrl);
            $cardpeekNav.text('View Card Details');
            var href = $target.attr('href');
            $cardpeekNav.attr('href', href);

            if (href) {
                $cardpeekNav.show();
            } else {
                $cardpeekNav.hide();
            }

            var clientRect = $target[0].getBoundingClientRect();
            var remainsBelow = $(window).height() - clientRect.bottom - 10;
            var remainsAbove = clientRect.top - 10;

            if (remainsBelow < 300 && remainsAbove > remainsBelow) {
                // above
                var top = $target.offset().top;
                $cardpeekContainer.css({
                    'left': $target.offset().left + 'px',
                    'top': (top - 10 - 300) + 'px'
                });
            } else {
                // below
                var bottom = $target.offset().top + $target.height();
                $cardpeekContainer.css({
                    'left': $target.offset().left + 'px',
                    'top': (bottom + 10) + 'px'
                });
            }


            $cardpeekContainer.show();

        }

        $cardpeekContainer.click(function () {
            $cardpeekContainer.hide();
        });


        $(selector).on('click', subselector, function (e) {
            var $target = $(e.target);
            if (extraCheck && !extraCheck($target)) {
                return;
            }

            var hoverSupported = !window.matchMedia('(hover: none)').matches;
            var sizeXs = !window.matchMedia('(min-width: 544px)').matches;
            if (hoverSupported && !sizeXs) {
                return;
            }

            e.stopPropagation();
            e.preventDefault();
            show($target);

        });

        $(selector).on('mouseenter', subselector, function (e) {
            var $target = $(e.target);
            if (extraCheck && !extraCheck($target)) {
                return;
            }

            var hoverSupported = !window.matchMedia('(hover: none)').matches;
            var sizeXs = !window.matchMedia('(min-width: 544px)').matches;
            if (!hoverSupported || sizeXs) {
                return;
            }

            show($target);
        });

        $(selector).on('mouseleave', subselector, function (e) {
            var $target = $(e.target);
            if (extraCheck && !extraCheck($target)) {
                return true;
            }

            var hoverSupported = !window.matchMedia('(hover: none)').matches;
            var sizeXs = !window.matchMedia('(min-width: 544px)').matches;
            if (!hoverSupported || sizeXs) {
                return;
            }

            $cardpeekContainer.hide();
        });

        $(window).on("beforeunload", function () {
            $cardpeekContainer.hide();
        });
    }
    window.cardpeek = cardpeek;
});