import Joi from "joi";

const userSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  username: Joi.string().alphanum().min(3).max(60).required(),
  password: Joi.string().min(6).max(100).required(),
});

export default userSchema;
