import Joi from "joi";

const messageSchema = Joi.object({
  conversationId: Joi.number().required(),
  content: Joi.string().min(1).max(1000).required(),
  replyToId: Joi.number().optional(),
});

export default messageSchema;
