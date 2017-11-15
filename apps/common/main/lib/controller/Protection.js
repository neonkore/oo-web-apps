/*
 *
 * (c) Copyright Ascensio System Limited 2010-2017
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA at Lubanas st. 125a-25, Riga, Latvia,
 * EU, LV-1021.
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product
 * logo when distributing the program. Pursuant to Section 7(e) we decline to
 * grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */

/**
 *  Protection.js
 *
 *  Created by Julia Radzhabova on 14.11.2017
 *  Copyright (c) 2017 Ascensio System SIA. All rights reserved.
 *
 */

if (Common === undefined)
    var Common = {};
Common.Controllers = Common.Controllers || {};

define([
    'core',
    'common/main/lib/view/Protection',
    'common/main/lib/view/PasswordDialog',
    'common/main/lib/view/SignDialog',
    'common/main/lib/view/SignSettingsDialog'
], function () {
    'use strict';

    Common.Controllers.Protection = Backbone.Controller.extend(_.extend({
        models : [],
        collections : [
        ],
        views : [
            'Common.Views.Protection'
        ],
        sdkViewName : '#id_main',

        initialize: function () {

            this.addListeners({
                'Common.Views.Protection': {
                    'protect:password':      _.bind(this.onPasswordClick, this),
                    'protect:signature':     _.bind(this.onSignatureClick, this)
                }
            });
        },
        onLaunch: function () {
            this._state = {};

            Common.NotificationCenter.on('app:ready', this.onAppReady.bind(this));
            Common.NotificationCenter.on('api:disconnect', _.bind(this.SetDisabled, this));
        },
        setConfig: function (data, api) {
            this.setApi(api);

            if (data) {
                this.sdkViewName        =   data['sdkviewname'] || this.sdkViewName;
            }
        },
        setApi: function (api) {
            if (api) {
                this.api = api;

                if (this.appConfig.isDesktopApp && this.appConfig.isOffline) {
                    this.api.asc_registerCallback('asc_onDocumentPassword',  _.bind(this.onDocumentPassword, this));
                    if (this.appConfig.canProtect) {
                        this.api.asc_registerCallback('asc_onSignatureClick',   _.bind(this.onApiSignatureClick, this));
                        this.api.asc_registerCallback('asc_onUpdateSignatures', _.bind(this.onApiUpdateSignatures, this));
                    }
                }
                this.api.asc_registerCallback('asc_onCoAuthoringDisconnect',_.bind(this.SetDisabled, this));
            }
        },

        setMode: function(mode) {
            this.appConfig = mode;

            this.view = this.createView('Common.Views.Protection', {
                mode: mode
            });

            return this;
        },

        onDocumentPassword: function(hasPassword) {
            if (!this.view) return;
            this.view.btnAddPwd.setVisible(!hasPassword);
            this.view.btnPwd.setVisible(hasPassword);
        },

        SetDisabled: function(state) {
            this.view && this.view.SetDisabled(state);
        },

        onPasswordClick: function(btn, opts){
            switch (opts) {
                case 'add': this.addPassword(); break;
                case 'delete': this.deletePassword(); break;
            }

            Common.NotificationCenter.trigger('edit:complete', this.view);
        },

        onSignatureClick: function(btn, opts){
            switch (opts) {
                case 'invisible': this.addInvisibleSignature(); break;
                case 'visible': this.addVisibleSignature(); break;
            }
        },

        createToolbarPanel: function() {
            return this.view.getPanel();
        },

        getView: function(name) {
            return !name && this.view ?
                this.view : Backbone.Controller.prototype.getView.call(this, name);
        },

        onAppReady: function (config) {
            var me = this;
        },

        addPassword: function() {
            var me = this,
                win = new Common.Views.PasswordDialog({
                    api: me.api,
                    signType: 'invisible',
                    handler: function(result, props) {
                        if (result == 'ok') {
                            me.api.asc_setCurrentPassword(props);
                        }
                        Common.NotificationCenter.trigger('edit:complete');
                    }
                });

            win.show();
        },

        deletePassword: function() {
            this.api.asc_resetPassword();
        },

        addInvisibleSignature: function(btn) {
            var me = this,
                win = new Common.Views.SignDialog({
                    api: me.api,
                    signType: 'invisible',
                    handler: function(dlg, result) {
                        if (result == 'ok') {
                            var props = dlg.getSettings();
                            me.api.asc_Sign(props.certificateId);
                        }
                        Common.NotificationCenter.trigger('edit:complete');
                    }
                });

            win.show();
        },

        addVisibleSignature: function(btn) {
            var me = this,
                win = new Common.Views.SignSettingsDialog({
                    handler: function(dlg, result) {
                        if (result == 'ok') {
                            me.api.asc_AddSignatureLine2(dlg.getSettings());
                        }
                        Common.NotificationCenter.trigger('edit:complete');
                    }
                });

            win.show();
        },

        signVisibleSignature: function(guid, width, height) {
            var me = this;
            if (_.isUndefined(me.fontStore)) {
                me.fontStore = new Common.Collections.Fonts();
                var fonts = me.getApplication().getController('Toolbar').getView('Toolbar').cmbFontName.store.toJSON();
                var arr = [];
                _.each(fonts, function(font, index){
                    if (!font.cloneid) {
                        arr.push(_.clone(font));
                    }
                });
                me.fontStore.add(arr);
            }

            var win = new Common.Views.SignDialog({
                api: me.api,
                signType: 'visible',
                fontStore: me.fontStore,
                signSize: {width: width || 0, height: height || 0},
                handler: function(dlg, result) {
                    if (result == 'ok') {
                        var props = dlg.getSettings();
                        me.api.asc_Sign(props.certificateId, guid, props.images[0], props.images[1]);
                    }
                    Common.NotificationCenter.trigger('edit:complete');
                }
            });

            win.show();
        },

        onApiSignatureClick: function(guid, width, height) {
            this.signVisibleSignature(guid, width, height);
        },

        onApiUpdateSignatures: function(valid, requested){
            this.SetDisabled(valid && valid.length>0);
        }

    }, Common.Controllers.Protection || {}));
});