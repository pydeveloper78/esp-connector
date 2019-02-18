'use strict';

//Setting up route
angular.module('authenticator').config(['$stateProvider',
    function ($stateProvider) {
        // Authenticator state routing
        $stateProvider.
            state('authenticate', {
                url: '/auth/:service?corrId&queue&app&redirect',
                templateUrl: 'modules/authenticator/views/authenticator.client.view.html',
                controller: 'AuthenticatorController',
                resolve: {
                    form: function (Authenticator, $stateParams) {
                        return Authenticator.getAuthFormData({service: $stateParams.service}).$promise;
                    }
                }
            })
            .state('authenticated', {
                url: '/auth/:service/:result?redirectUrl',
                templateUrl: 'modules/authenticator/views/authenticator.result.client.view.html',
                controller: 'AuthenticatorResultController'
            });
    }
]);
