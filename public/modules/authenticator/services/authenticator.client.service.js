'use strict';

//Authenticators service used to communicate Authenticators REST endpoints
angular.module('authenticator').factory('Authenticator', ['$resource',
    function($resource) {
        return $resource('esp/:service/:controller', {}, {
            authenticate: {
                method: 'POST',
                params: {
                    controller: 'auth'
                }
            },
            getAuthFormData: {
                method: 'GET',
                params: {
                    controller: 'form'
                }
            },
            savePublication: {
                method: 'POST',
                params: {
                    controller: 'publication'
                }
            }
        });
    }
]);
