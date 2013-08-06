// # Article Editor

/*global window, document, $, _, Backbone, Ghost, Showdown, CodeMirror, shortcut, Countable, JST */
(function () {
    "use strict";

    var PublishBar,
        TagWidget,
        ActionsWidget,
        MarkdownShortcuts = [
            {'key': 'Ctrl+B', 'style': 'bold'},
            {'key': 'Meta+B', 'style': 'bold'},
            {'key': 'Ctrl+I', 'style': 'italic'},
            {'key': 'Meta+I', 'style': 'italic'},
            {'key': 'Ctrl+Alt+U', 'style': 'strike'},
            {'key': 'Ctrl+Shift+K', 'style': 'code'},
            {'key': 'Ctrl+Alt+1', 'style': 'h1'},
            {'key': 'Ctrl+Alt+2', 'style': 'h2'},
            {'key': 'Ctrl+Alt+3', 'style': 'h3'},
            {'key': 'Ctrl+Alt+4', 'style': 'h4'},
            {'key': 'Ctrl+Alt+5', 'style': 'h5'},
            {'key': 'Ctrl+Alt+6', 'style': 'h6'},
            {'key': 'Ctrl+Shift+L', 'style': 'link'},
            {'key': 'Ctrl+Shift+I', 'style': 'image'},
            {'key': 'Ctrl+Q', 'style': 'blockquote'},
            {'key': 'Ctrl+Shift+1', 'style': 'currentdate'},
            {'key': 'Ctrl+U', 'style': 'uppercase'},
            {'key': 'Ctrl+Shift+U', 'style': 'lowercase'},
            {'key': 'Ctrl+Alt+Shift+U', 'style': 'titlecase'},
            {'key': 'Ctrl+Alt+W', 'style': 'selectword'},
            {'key': 'Ctrl+L', 'style': 'list'},
            {'key': 'Ctrl+Alt+C', 'style': 'copyHTML'},
            {'key': 'CMD+Alt+C', 'style': 'copyHTML'}
        ];

    // The publish bar associated with a post, which has the TagWidget and
    // Save button and options and such.
    // ----------------------------------------
    PublishBar = Ghost.View.extend({

        initialize: function () {
            this.addSubview(new TagWidget({el: this.$('#entry-categories'), model: this.model})).render();
            this.addSubview(new ActionsWidget({el: this.$('#entry-actions'), model: this.model})).render();
        },

        render: function () { return this; }

    });

    // The Tag UI area associated with a post
    // ----------------------------------------
    TagWidget = Ghost.View.extend({
        render: function () { return this; }
    });

    // The Publish, Queue, Publish Now buttons
    // ----------------------------------------
    ActionsWidget = Ghost.View.extend({

        events: {
            'click [data-set-status]': 'handleStatus',
            'click .js-post-button': 'updatePost'
        },

        statusMap: {
            'draft' : 'Save Draft',
            'published': 'Update Post',
            'scheduled' : 'Save Schedued Post'
        },

        initialize: function () {
            var self = this;
            // Toggle publish
            shortcut.add("Ctrl+Alt+P", function () {
                self.toggleStatus();
            });
            shortcut.add("Ctrl+S", function () {
                self.updatePost();
            });
            shortcut.add("Meta+S", function () {
                self.updatePost();
            });
            this.listenTo(this.model, 'change:status', this.render);
            this.model.on('change:id', function (m) {
                Backbone.history.navigate('/editor/' + m.id);
            });
        },

        toggleStatus: function () {
            var keys = Object.keys(this.statusMap),
                model = this.model,
                currentIndex = keys.indexOf(model.get('status')),
                newIndex;


            if (keys[currentIndex + 1] === 'scheduled') { // TODO: Remove once scheduled posts work
                newIndex = currentIndex + 2 > keys.length - 1 ? 0 : currentIndex + 1;
            } else {
                newIndex = currentIndex + 1 > keys.length - 1 ? 0 : currentIndex + 1;
            }

            this.savePost({
                status: keys[newIndex]
            }).then(function () {
                Ghost.notifications.addItem({
                    type: 'success',
                    message: 'Your post: ' + model.get('title') + ' has been ' + keys[newIndex],
                    status: 'passive'
                });
            }, function () {
                Ghost.notifications.addItem({
                    type: 'error',
                    message: 'Your post: ' + model.get('title') + ' has not been ' + keys[newIndex],
                    status: 'passive'
                });
            });
        },

        handleStatus: function (e) {
            e.preventDefault();
            var status = $(e.currentTarget).attr('data-set-status'),
                model = this.model,
                self = this;

            if (status === 'publish-on') {
                Ghost.notifications.addItem({
                    type: 'alert',
                    message: 'Scheduled publishing not supported yet.',
                    status: 'passive'
                });
            }
            if (status === 'queue') {
                Ghost.notifications.addItem({
                    type: 'alert',
                    message: 'Scheduled publishing not supported yet.',
                    status: 'passive'
                });
            }

            this.savePost({
                status: status
            }).then(function () {
                Ghost.notifications.addItem({
                    type: 'success',
                    message: 'Your post: ' + model.get('title') + ' has been ' + status,
                    status: 'passive'
                });
            }, function () {
                Ghost.notifications.addItem({
                    type: 'error',
                    message: 'Your post: ' + model.get('title') + ' has not been ' + status,
                    status: 'passive'
                });
            });
        },

        updatePost: function (e) {
            if (e) {
                e.preventDefault();
            }
            var model = this.model,
                self = this;
            this.savePost().then(function () {
                Ghost.notifications.addItem({
                    type: 'success',
                    message: 'Your post was saved as ' + model.get('status'),
                    status: 'passive'
                });
            }, function () {
                Ghost.notifications.addItem({
                    type: 'error',
                    message: model.validationError,
                    status: 'passive'
                });
            });
        },

        savePost: function (data) {
            // TODO: The content_raw getter here isn't great, shouldn't rely on currentView.
            _.each(this.model.blacklist, function (item) {
                this.model.unset(item);
            }, this);

            var saved = this.model.save(_.extend({
                title: $('#entry-title').val(),
                content_raw: Ghost.currentView.editor.getValue()
            }, data));

            // TODO: Take this out if #2489 gets merged in Backbone. Or patch Backbone
            // ourselves for more consistent promises.
            if (saved) {
                return saved;
            }
            return $.Deferred().reject();
        },

        render: function () {
            this.$('.js-post-button').text(this.statusMap[this.model.get('status')]);
        }

    });

    // The entire /editor page's route (TODO: move all views to client side templates)
    // ----------------------------------------
    Ghost.Views.Editor = Ghost.View.extend({

        initialize: function () {

            // Add the container view for the Publish Bar
            this.addSubview(new PublishBar({el: "#publish-bar", model: this.model})).render();

            this.$('#entry-markdown').html(this.model.get('content_raw'));

            this.initMarkdown();
            this.renderPreview();

            $('.entry-content header, .entry-preview header').on('click', function () {
                $('.entry-content, .entry-preview').removeClass('active');
                $(this).closest('section').addClass('active');
            });

            $('.entry-title .icon-fullscreen').on('click', function (e) {
                e.preventDefault();
                $('body').toggleClass('fullscreen');
            });

            $('.options.up').on('click', function (e) {
                e.stopPropagation();
                $(this).next("ul").fadeToggle(200);
            });

            this.$('.CodeMirror-scroll').on('scroll', this.syncScroll);

            // Shadow on Markdown if scrolled
            this.$('.CodeMirror-scroll').on('scroll', function (e) {
                if ($('.CodeMirror-scroll').scrollTop() > 10) {
                    $('.entry-markdown').addClass('scrolling');
                } else {
                    $('.entry-markdown').removeClass('scrolling');
                }
            });

            // Shadow on Preview if scrolled
            this.$('.entry-preview-content').on('scroll', function (e) {
                if ($('.entry-preview-content').scrollTop() > 10) {
                    $('.entry-preview').addClass('scrolling');
                } else {
                    $('.entry-preview').removeClass('scrolling');
                }
            });

            // Zen writing mode shortcut
            shortcut.add("Alt+Shift+Z", function () {
                $('body').toggleClass('zen');
            });

            $('.entry-markdown header, .entry-preview header').click(function (e) {
                $('.entry-markdown, .entry-preview').removeClass('active');
                $(e.target).closest('section').addClass('active');
            });

        },

        events: {
            'click .markdown-help': 'showHelp'
        },

        syncScroll: _.debounce(function (e) {
            var $codeViewport = $(e.target),
                $previewViewport = $('.entry-preview-content'),
                $codeContent = $('.CodeMirror-sizer'),
                $previewContent = $('.rendered-markdown'),

                // calc position
                codeHeight = $codeContent.height() - $codeViewport.height(),
                previewHeight = $previewContent.height() - $previewViewport.height(),
                ratio = previewHeight / codeHeight,
                previewPostition = $codeViewport.scrollTop() * ratio;

            // apply new scroll
            $previewViewport.scrollTop(previewPostition);
        }, 50),

        showHelp: function () {
            this.addSubview(new Ghost.Views.Modal({
                model: {
                    options: {
                        close: true,
                        type: "info",
                        style: "wide",
                        animation: 'fadeIn'
                    },
                    content: {
                        template: 'markdown',
                        title: 'Markdown Help'
                    }
                }
            }));
        },

        // This updates the editor preview panel.
        // Currently gets called on every key press.
        // Also trigger word count update
        renderPreview: function () {
            var view = this,
                preview = document.getElementsByClassName('rendered-markdown')[0];
            preview.innerHTML = this.converter.makeHtml(this.editor.getValue());
            Countable.once(preview, function (counter) {
                view.$('.entry-word-count').text(counter.words + ' words');
                view.$('.entry-character-count').text(counter.characters + ' characters');
                view.$('.entry-paragraph-count').text(counter.paragraphs + ' paragraphs');
            });
        },

        // Markdown converter & markdown shortcut initialization.
        initMarkdown: function () {
            this.converter = new Showdown.converter({extensions: ['ghostdown']});
            this.editor = CodeMirror.fromTextArea(document.getElementById('entry-markdown'), {
                mode: 'markdown',
                tabMode: 'indent',
                tabindex: "2",
                lineWrapping: true
            });

            var view = this;

            // Inject modal for HTML to be viewed in
            shortcut.add("Ctrl+Alt+C", function () {
                view.showHTML();
            });
            shortcut.add("Ctrl+Alt+C", function () {
                view.showHTML();
            });

            _.each(MarkdownShortcuts, function (combo) {
                shortcut.add(combo.key, function () {
                    return view.editor.addMarkdown({style: combo.style});
                });
            });

            this.editor.on('change', function () {
                view.renderPreview();
            });
        },

        showHTML: function () {
            this.addSubview(new Ghost.Views.Modal({
                model: {
                    options: {
                        close: true,
                        type: "info",
                        style: "wide",
                        animation: 'fadeIn'
                    },
                    content: {
                        template: 'copyToHTML',
                        title: 'Copied HTML'
                    }
                }
            }));
        },

        render: function () { return this; }
    });

}());