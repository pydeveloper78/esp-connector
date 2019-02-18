'use strict';

module.exports = {
	app: {
		title: 'ESP-Connector',
		description: 'MEAN stack middleware application connecting to email service providers',
		keywords: 'email service provider, esp-connector, esp'
	},
	port: process.env.PORT || 3000,
	templateEngine: 'swig',
	sessionSecret: 'MEAN',
	sessionCollection: 'sessions',
	assets: {
		lib: {
			css: [
				'public/lib/bootstrap/dist/css/bootstrap.css',
				'public/lib/bootstrap/dist/css/bootstrap-theme.css',
			],
			js: [
				'public/lib/angular/angular.js',
				'public/lib/angular-resource/angular-resource.js', 
				'public/lib/angular-cookies/angular-cookies.js', 
				'public/lib/angular-animate/angular-animate.js', 
				'public/lib/angular-touch/angular-touch.js', 
				'public/lib/angular-sanitize/angular-sanitize.js', 
				'public/lib/angular-ui-router/release/angular-ui-router.js',
				'public/lib/angular-ui-utils/ui-utils.js',
				'public/lib/angular-bootstrap/ui-bootstrap-tpls.js'
			]
		},
		css: [
			'public/modules/**/css/*.css'
		],
		js: [
			'public/config.js',
			'public/application.js',
			'public/modules/*/*.js',
			'public/modules/*/*[!tests]*/*.js'
		],
		tests: [
			'public/lib/angular-mocks/angular-mocks.js',
			'public/modules/*/tests/*.js'
		]
	},
	connectors: {
		aweber: {
			form: {
				fields: [],
				submitText: 'Click here to authenticate'
			},
			callbackURL: '/esp/aweber/oauthCallback',
			consumerKey: 'AkgK5dj6sMRpavSDKY0NFe83',
			consumerSecret: '4AjrtzOg0FmpqAQtYp7mLKU944XMMuLkHQq8L8er'
		},
		mailchimp: {
			form: {
				fields: ['api_key']
			}
		},
		emaildirect: {
			form: {
				fields: ['api_key']
			}
		}
	}
};
