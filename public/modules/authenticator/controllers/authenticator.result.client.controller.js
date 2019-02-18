'use strict';

// Authenticator controller
angular.module('authenticator').controller('AuthenticatorResultController', ['$scope', '$stateParams', '$location', 'Authentication', 'Authenticator', '$window', '$timeout',
    function($scope, $stateParams, $location, Authentication, Authenticator, $window, $timeout) {
        $scope.data = {
            service: $stateParams.service,
            result: $stateParams.result,
            redirectUrl: $stateParams.redirectUrl
        };

        $scope.success = function() {
            return $scope.data.result === 'success';
        };

        $timeout(function () {
            $window.location.href = $scope.data.redirectUrl;
        }, 3000);
    }
]);
