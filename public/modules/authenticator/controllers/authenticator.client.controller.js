'use strict';

// Authenticator controller
angular.module('authenticator').controller('AuthenticatorController', ['$scope', '$stateParams', '$location', 'Authentication', 'Authenticator', 'form', '$window',
    function ($scope, $stateParams, $location, Authentication, Authenticator, form, $window, $http) {
        $scope.authentication = Authentication;
        $scope.form = {
            service: $stateParams.service,
            corrId: $stateParams.corrId,
            queue: $stateParams.queue,
            app: $stateParams.app,
            redirect: $stateParams.redirect
        };
        $scope.fields = form.fields;
        $scope.submitText = form.submitText ? form.submitText : 'Save';

        $scope.alert = {
            message: '',
            error: false
        };

        $scope.step = 1;

        /**
         * Validate before submit form
         * @returns {boolean}
         */
        $scope.canSubmit = function () {
            for (var i = 0; i < $scope.fields.length; i++) {
                if (!$scope.form[$scope.fields[i]] || $scope.form[$scope.fields[i]] === '') {
                    return false;
                }
            }
            return true;
        };

        /**
         * Replace _ to white space.
         *
         * @param field
         * @returns {*}
         */
        $scope.displayField = function (field) {
            return field.replace('_', ' ');
        };

        /**
         * Alert handler
         * @param status
         * @param msg
         */
        function alertHandler(status, msg) {
            $scope.alert.error = status;
            $scope.alert.message = msg;
        }

        /**
         * Save connection
         */
        $scope.saveConnection = function () {
            Authenticator.authenticate({service: $scope.form.service}, $scope.form, function (data) {
                if (data.publications) {
                    $scope.step = 2;
                    $scope.publications = data.publications;
                } else if (data.redirectUrl) {
                    $window.location.href = data.redirectUrl;
                } else {
                    $scope.step = 3;
                    alertHandler(false, 'Authentication has been successfully done!');
                }
            }, function (err) {
                $scope.step = 3;
                alertHandler(true, 'Authentication failed!');
            });
        };

        /**
         * Check publication select form validation
         * @param form
         * @returns {boolean|FormController.$valid|*|ngModel.NgModelController.$valid|ngModel.NgModelController#$setValidity.$valid|Oc.$valid}
         */
        $scope.canSubmitPublication = function (form) {
            return form.$valid;
        };

        /**
         * Save selected publication
         * @param form
         */
        $scope.savePublication = function (form) {
            if (form.$valid) {
                Authenticator.savePublication({service: $scope.form.service}, $scope.form, function (data) {
                    $scope.step = 3;
                    alertHandler(false, 'Authentication has been successfully done!');
                }, function (err) {
                    $scope.step = 3;
                    alertHandler(true, 'Authentication failed!');
                });
            }
        };
    }
]);
