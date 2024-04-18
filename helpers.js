// helper function for getting a user by their email
const getUserByEmail = function(email, users) {
  for (const userId in users) {
    if (users[userId].email === email) {
      return users[userId];
    }
  }
  return null;
};

const generateRandomString = function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    const index = Math.floor(Math.random() * characters.length); // Generates a random index for characters
    result += characters[index]; // Adds the random generated index to select from characters
  }
  return result;
};

// helper which returns the URLs where the userID is equal to the id of the currently logged-in user.
const urlsForUser = function(id, urlDatabase) {
  const userUrls = {};
  for (const urlId in urlDatabase) {
    if (urlDatabase[urlId].userID === id) {
      userUrls[urlId] = urlDatabase[urlId];
    }
  }
  return userUrls;
};


module.exports = { getUserByEmail, generateRandomString, urlsForUser };