const { assert } = require('chai');
const { getUserByEmail } = require('../helpers.js');

const testUsers = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
};

describe('getUserByEmail', function() {

  it('should return a user with valid email', function() {
    const user = getUserByEmail("user@example.com", testUsers);
    const expectedUserID = "userRandomID";
    assert.strictEqual(user.id, expectedUserID, "The returned user ID should match the expected user ID.");
  });

  it('should return null if the email is not in the database', function() {
    const user = getUserByEmail("doesnotexist@example.com", testUsers);
    assert.isNull(user, "Function should return null for an email that does not exist in the database.");
  });

  it('should return null if the email provided is an empty string', function() {
    const user = getUserByEmail("", testUsers);
    assert.isNull(user, "Function should return null when an empty string is used as the email.");
  });

  it('should be case sensitive', function() {
    const user = getUserByEmail("USER@EXAMPLE.COM", testUsers);
    assert.isNull(user, "The function should be case sensitive, and 'USER@EXAMPLE.COM' is not the same as 'user@example.com'.");
  });

});
