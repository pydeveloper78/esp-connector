'use strict';

var should = require('should'),
	request = require('supertest'),
	app = require('../../server'),
	mongoose = require('mongoose'),
	User = mongoose.model('User'),
	Authenticator = mongoose.model('Authenticator'),
	agent = request.agent(app);

/**
 * Globals
 */
var credentials, user, authenticator;

/**
 * Authenticator routes tests
 */
describe('Authenticator CRUD tests', function() {
	beforeEach(function(done) {
		// Create user credentials
		credentials = {
			username: 'username',
			password: 'password'
		};

		// Create a new user
		user = new User({
			firstName: 'Full',
			lastName: 'Name',
			displayName: 'Full Name',
			email: 'test@test.com',
			username: credentials.username,
			password: credentials.password,
			provider: 'local'
		});

		// Save a user to the test db and create new Authenticator
		user.save(function() {
			authenticator = {
				name: 'Authenticator Name'
			};

			done();
		});
	});

	it('should be able to save Authenticator instance if logged in', function(done) {
		agent.post('/auth/signin')
			.send(credentials)
			.expect(200)
			.end(function(signinErr, signinRes) {
				// Handle signin error
				if (signinErr) done(signinErr);

				// Get the userId
				var userId = user.id;

				// Save a new Authenticator
				agent.post('/authenticators')
					.send(authenticator)
					.expect(200)
					.end(function(authenticatorSaveErr, authenticatorSaveRes) {
						// Handle Authenticator save error
						if (authenticatorSaveErr) done(authenticatorSaveErr);

						// Get a list of Authenticators
						agent.get('/authenticators')
							.end(function(authenticatorsGetErr, authenticatorsGetRes) {
								// Handle Authenticator save error
								if (authenticatorsGetErr) done(authenticatorsGetErr);

								// Get Authenticators list
								var authenticators = authenticatorsGetRes.body;

								// Set assertions
								(authenticators[0].user._id).should.equal(userId);
								(authenticators[0].name).should.match('Authenticator Name');

								// Call the assertion callback
								done();
							});
					});
			});
	});

	it('should not be able to save Authenticator instance if not logged in', function(done) {
		agent.post('/authenticators')
			.send(authenticator)
			.expect(401)
			.end(function(authenticatorSaveErr, authenticatorSaveRes) {
				// Call the assertion callback
				done(authenticatorSaveErr);
			});
	});

	it('should not be able to save Authenticator instance if no name is provided', function(done) {
		// Invalidate name field
		authenticator.name = '';

		agent.post('/auth/signin')
			.send(credentials)
			.expect(200)
			.end(function(signinErr, signinRes) {
				// Handle signin error
				if (signinErr) done(signinErr);

				// Get the userId
				var userId = user.id;

				// Save a new Authenticator
				agent.post('/authenticators')
					.send(authenticator)
					.expect(400)
					.end(function(authenticatorSaveErr, authenticatorSaveRes) {
						// Set message assertion
						(authenticatorSaveRes.body.message).should.match('Please fill Authenticator name');
						
						// Handle Authenticator save error
						done(authenticatorSaveErr);
					});
			});
	});

	it('should be able to update Authenticator instance if signed in', function(done) {
		agent.post('/auth/signin')
			.send(credentials)
			.expect(200)
			.end(function(signinErr, signinRes) {
				// Handle signin error
				if (signinErr) done(signinErr);

				// Get the userId
				var userId = user.id;

				// Save a new Authenticator
				agent.post('/authenticators')
					.send(authenticator)
					.expect(200)
					.end(function(authenticatorSaveErr, authenticatorSaveRes) {
						// Handle Authenticator save error
						if (authenticatorSaveErr) done(authenticatorSaveErr);

						// Update Authenticator name
						authenticator.name = 'WHY YOU GOTTA BE SO MEAN?';

						// Update existing Authenticator
						agent.put('/authenticators/' + authenticatorSaveRes.body._id)
							.send(authenticator)
							.expect(200)
							.end(function(authenticatorUpdateErr, authenticatorUpdateRes) {
								// Handle Authenticator update error
								if (authenticatorUpdateErr) done(authenticatorUpdateErr);

								// Set assertions
								(authenticatorUpdateRes.body._id).should.equal(authenticatorSaveRes.body._id);
								(authenticatorUpdateRes.body.name).should.match('WHY YOU GOTTA BE SO MEAN?');

								// Call the assertion callback
								done();
							});
					});
			});
	});

	it('should be able to get a list of Authenticators if not signed in', function(done) {
		// Create new Authenticator model instance
		var authenticatorObj = new Authenticator(authenticator);

		// Save the Authenticator
		authenticatorObj.save(function() {
			// Request Authenticators
			request(app).get('/authenticators')
				.end(function(req, res) {
					// Set assertion
					res.body.should.be.an.Array.with.lengthOf(1);

					// Call the assertion callback
					done();
				});

		});
	});


	it('should be able to get a single Authenticator if not signed in', function(done) {
		// Create new Authenticator model instance
		var authenticatorObj = new Authenticator(authenticator);

		// Save the Authenticator
		authenticatorObj.save(function() {
			request(app).get('/authenticators/' + authenticatorObj._id)
				.end(function(req, res) {
					// Set assertion
					res.body.should.be.an.Object.with.property('name', authenticator.name);

					// Call the assertion callback
					done();
				});
		});
	});

	it('should be able to delete Authenticator instance if signed in', function(done) {
		agent.post('/auth/signin')
			.send(credentials)
			.expect(200)
			.end(function(signinErr, signinRes) {
				// Handle signin error
				if (signinErr) done(signinErr);

				// Get the userId
				var userId = user.id;

				// Save a new Authenticator
				agent.post('/authenticators')
					.send(authenticator)
					.expect(200)
					.end(function(authenticatorSaveErr, authenticatorSaveRes) {
						// Handle Authenticator save error
						if (authenticatorSaveErr) done(authenticatorSaveErr);

						// Delete existing Authenticator
						agent.delete('/authenticators/' + authenticatorSaveRes.body._id)
							.send(authenticator)
							.expect(200)
							.end(function(authenticatorDeleteErr, authenticatorDeleteRes) {
								// Handle Authenticator error error
								if (authenticatorDeleteErr) done(authenticatorDeleteErr);

								// Set assertions
								(authenticatorDeleteRes.body._id).should.equal(authenticatorSaveRes.body._id);

								// Call the assertion callback
								done();
							});
					});
			});
	});

	it('should not be able to delete Authenticator instance if not signed in', function(done) {
		// Set Authenticator user 
		authenticator.user = user;

		// Create new Authenticator model instance
		var authenticatorObj = new Authenticator(authenticator);

		// Save the Authenticator
		authenticatorObj.save(function() {
			// Try deleting Authenticator
			request(app).delete('/authenticators/' + authenticatorObj._id)
			.expect(401)
			.end(function(authenticatorDeleteErr, authenticatorDeleteRes) {
				// Set message assertion
				(authenticatorDeleteRes.body.message).should.match('User is not logged in');

				// Handle Authenticator error error
				done(authenticatorDeleteErr);
			});

		});
	});

	afterEach(function(done) {
		User.remove().exec();
		Authenticator.remove().exec();
		done();
	});
});