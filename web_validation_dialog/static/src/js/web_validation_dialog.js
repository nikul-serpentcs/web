odoo.define("web_validation_dialog.ValidationDialog", function (require) {
    "use strict";

    var core = require('web.core');
    var FormWidget = require('web.form_widgets');
    var Dialog = require('web.Dialog');
    var Model = require('web.DataModel');
    var framework = require('web.framework');
    var pyeval = require('web.pyeval');

    var QWeb = core.qweb;
    var _t = core._t;

    FormWidget.WidgetButton.include({
        init: function (field_manager, node) {
            this._super(field_manager, node);
            this.options = pyeval.py_eval(this.node.attrs.options || '{}');
            this.is_dialog_security =
                this.options.security ? this.options.security : false;
        },
        exec_action: function () {
            var self = this;
            if (self.node.attrs.confirm && self.is_dialog_security) {
                Dialog.confirm(self, self.node.attrs.confirm, {
                    buttons: [
                        {
                            text: _t("Ok"),
                            classes: 'btn-primary',
                            click: function() {
                                this.close();
                                self.open_pincode_dialog();
                            },
                        },
                        {
                            text: _t('Cancel'),
                            close: true
                        },
                    ]
                });
            } else if (self.node.attrs.confirm) {
                    var def = $.Deferred();
                    Dialog.confirm(self,
                            self.node.attrs.confirm,
                            {confirm_callback: self.on_confirmed}).
                        on("closed", null, function() {
                            def.resolve();
                        });
                    return def.promise();
                } else {
                    return self.on_confirmed();
                }
        },
        execute_action: function() {
            var self = this;
            if (!this.node.attrs.special) {
                return this.view.recursive_save().then(self.exec_action());
            } else {
                return self.exec_action();
            }
        },
        open_pincode_dialog : function() {
            var self = this;
            new Dialog(self, {
                title: _t('Validation'),
                size : "small",
                $content: QWeb.render('DialogValidation'),
                buttons: [
                            {
                                text: _t("Ok"),
                                classes: 'btn-primary',
                                click: function() {
                                   var curr_obj = this;
                                   var password =
                                       this.$el.find("#pincode").val();
                                   if (password) {
                                       framework.blockUI();
                                       var check_pincode =
                                           self.validate_pincode(
                                                   self.is_dialog_security,
                                                   password);
                                       check_pincode.done(function(result) {
                                           framework.unblockUI();
                                           if (result) {
                                               curr_obj.close();
                                              self.on_confirmed();
                                           } else {
                                               Dialog.alert(self, _t("Invalid" +
                                                   " or Wrong Password!" +
                                                   "Contact your " +
                                                   "Administrator."));
                                           }
                                       }).fail(function(error) {
                                           framework.unblockUI();
                                           Dialog.alert(self, _t("" +
                                               "Either the password is wrong" +
                                               " or the connection is lost!" +
                                               " Contact your" +
                                               "Administrator."));
                                       });
                                   } else {
                                       Dialog.alert(self, _t("Please Enter the Password."));
                                   }
                                },
                            },
                            {
                                text: _t('Cancel'),
                                close: true,
                            },
                         ],
            }).open();
        },
        validate_pincode : function (field, value) {
            var self = this;
            var data_vals = {
                "field": field,
                "password": value,
                "companyId": self.session.company_id,
            };
            return new Model("res.company").call("check_security", [data_vals]);
        },
    });

});
