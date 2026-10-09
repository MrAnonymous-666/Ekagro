// found this bug after reading about mass assignment for INS - was just doing
// Object.assign(task, req.body) everywhere which lets someone send a "user"
// field and steal a task. this fixes it by only copying the fields i actually
// allow per route

function pickFields(source, allowedFields) {
  const result = {};
  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      result[field] = source[field];
    }
  });
  return result;
}

module.exports = pickFields;
