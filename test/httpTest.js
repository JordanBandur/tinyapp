const chai = require("chai");
const chaiHttp = require("chai-http");
const expect = chai.expect;
chai.use(chaiHttp);

describe('URL Shortener Service', function() {
  const server = 'http://localhost:8080'; // adjust if your server is running on a different port
  let agent = chai.request.agent(server); // Using agent to maintain cookies across requests

  after(function() {
    agent.close(); // Close the agent after tests
  });

  describe('User Authentication', function() {
    it('should redirect an unauthenticated user from /urls to /login', function(done) {
      agent
        .get('/urls')
        .end((err, res) => {
          expect(res).to.have.status(401);
          expect(res.text).to.include('Please log in or register');
          done(err);
        });
    });

    it('should allow a user to register, login, and be redirected to /urls', function(done) {
      agent
        .post('/register')
        .send({ email: 'newuser@example.com', password: 'test123' })
        .then(() => {
          return agent.post('/login')
            .send({ email: 'newuser@example.com', password: 'test123' });
        })
        .then((res) => {
          expect(res).to.redirect;
          expect(res).to.have.status(200); // Follow the redirect to /urls
          return agent.get('/urls'); // Check if the user can access /urls after login
        })
        .then((res) => {
          expect(res).to.have.status(200);
          expect(res).to.not.redirect;
          done();
        })
        .catch((err) => {
          done(err);
        });
    });

    it('should log out a user and redirect to /login', function(done) {
      agent
        .post('/logout')
        .then((res) => {
          expect(res).to.redirect;
          expect(res).to.have.status(200); // Follow the redirect to /login
          return agent.get('/urls'); // Check access after logout
        })
        .then((res) => {
          expect(res).to.have.status(401);
          done();
        })
        .catch((err) => {
          done(err);
        });
    });
  });

  describe('URL Management', function() {
    before(function(done) {
      // Register a user
      agent
        .post('/register')
        .send({ email: 'valid@example.com', password: 'correctpassword' })
        .end((err, res) => {
          if (err) return done(err);
          expect(res).to.have.status(200); // Assuming successful registration returns 200
          done();
        });
    });

    before(function(done) {
      // Login using agent to maintain session
      agent
        .post('/login')
        .send({ email: 'valid@example.com', password: 'correctpassword' })
        .end((err, res) => {
          if (err) return done(err);
          expect(res).to.have.status(200);
          done();
        });
    });

    it('should create a new short URL and redirect to its page', function(done) {
      agent
        .post('/urls')
        .send({ longURL: 'http://example.com' })
        .end((err, res) => {
          if (err) return done(err);
          expect(res).to.redirect;
          expect(res).to.have.status(200); // Expecting a redirect to the new URL's page
          expect(res).to.redirectTo(/\/urls\/.+/); // Check if it redirects to a URL page
          done();
        });
    });

    after(function() {
      agent.close();
    });
  });
});