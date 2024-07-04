// Function to retrieve a user object by their email from a given database

const getUserByEmail = function(email, database) {
  for (const userId in database) {
    const user = database[userId];
    if (user.email === email) {
      return user;
    }
  }
  return undefined;
};

module.exports = { getUserByEmail };