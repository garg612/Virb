import prisma from "../db/prisma.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { publishChatEvent } from "../rabbitmq/index.js";

// 1. Create a sell requirement (hidden by default, only found via search)
export const createRequirement = asyncHandler(async (req, res) => {
  const sellerId = req.user.id;
  const { title, description, price, currency = "USD", category = "general", image } = req.body;

  if (!title || !description || price === undefined) {
    return res.status(400).json({
      message: "Title, description, and price are required",
    });
  }

  const numericPrice = parseFloat(price);
  if (isNaN(numericPrice) || numericPrice <= 0) {
    return res.status(400).json({
      message: "Price must be a valid positive number",
    });
  }

  const images = image ? [image] : [];

  const product = await prisma.product.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      price: numericPrice,
      currency: currency.toUpperCase(),
      category: category.trim().toLowerCase(),
      images,
      status: "ACTIVE",
      sellerId,
    },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

  return res.status(201).json({
    message: "Sell requirement listed successfully. It is kept private until searched.",
    product,
  });
});

// 2. Get the authenticated user's own listed requirements
export const getMyRequirements = asyncHandler(async (req, res) => {
  const sellerId = req.user.id;

  const products = await prisma.product.findMany({
    where: {
      sellerId,
    },
    include: {
      orders: {
        include: {
          buyer: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res.status(200).json({
    message: "My sell requirements retrieved successfully",
    products,
  });
});

// 3. Delete / Remove requirement
export const deleteRequirement = asyncHandler(async (req, res) => {
  const sellerId = req.user.id;
  const productId = Number(req.params.id);

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return res.status(404).json({ message: "Product requirement not found" });
  }

  if (product.sellerId !== sellerId) {
    return res.status(403).json({ message: "You are not authorized to delete this requirement" });
  }

  await prisma.product.delete({
    where: { id: productId },
  });

  return res.status(200).json({
    message: "Requirement removed successfully",
    productId,
  });
});

// 4. Search requirements (e.g. "car", "phone") - Always hidden until searched!
export const searchRequirements = asyncHandler(async (req, res) => {
  const query = (req.query.q as string || "").trim();

  // If query is empty, do NOT reveal products to maintain privacy
  if (!query) {
    return res.status(200).json({
      message: "Please enter a search keyword",
      products: [],
    });
  }

  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res.status(200).json({
    message: `Found ${products.length} matching products for '${query}'`,
    products,
  });
});

// 5. Connect buyer with seller to chat about a specific product requirement
export const startChatWithSeller = asyncHandler(async (req, res) => {
  const buyerId = req.user.id;
  const productId = Number(req.body.productId);

  if (!productId) {
    return res.status(400).json({ message: "Product ID is required" });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

  if (!product) {
    return res.status(404).json({ message: "Product requirement not found" });
  }

  if (product.sellerId === buyerId) {
    return res.status(400).json({ message: "You cannot start a chat with yourself as seller" });
  }

  const sellerId = product.sellerId;

  // Find or create direct conversation
  let conversation = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      participants: {
        every: {
          id: {
            in: [buyerId, sellerId],
          },
        },
        some: {
          id: {
            in: [buyerId, sellerId],
          },
        },
      },
    },
    include: {
      participants: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          email: true,
        },
      },
    },
  });

  if (!conversation) {
    // Brand new conversation: only buyer has initiated it.
    // The seller has NOT accepted yet, so this goes to the seller's Requests tab!
    conversation = await prisma.conversation.create({
      data: {
        participants: {
          connect: [{ id: buyerId }, { id: sellerId }],
        },
        acceptedUserIds: [buyerId],
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            email: true,
          },
        },
      },
    });
  } else {
    // Existing conversation: ensure buyerId is marked as accepted on their end,
    // but DO NOT force sellerId! If seller never approved previously, it stays as a request.
    const acceptedSet = new Set(conversation.acceptedUserIds || []);
    if (!acceptedSet.has(buyerId)) {
      acceptedSet.add(buyerId);
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          acceptedUserIds: Array.from(acceptedSet),
        },
        include: {
          participants: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              email: true,
            },
          },
        },
      });
    }
  }

  // Send initial inquiry message into the chat
  const inquiryContent = `👋 Hi @${product.seller.username}, I found your listing: "${product.title}" ($${product.price} ${product.currency}). Is this item still available?`;
  const message = await prisma.message.create({
    data: {
      content: inquiryContent,
      conversationId: conversation.id,
      SenderId: buyerId,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

  await publishChatEvent("newMessage", conversation.id.toString(), message);

  // Notify both users in real-time so the seller's sidebar immediately shows the new request
  const conversationPayload = {
    ...conversation,
    messages: [message],
    updatedAt: new Date().toISOString(),
  };
  await publishChatEvent("conversationUpdated", sellerId.toString(), conversationPayload);
  await publishChatEvent("conversationUpdated", buyerId.toString(), conversationPayload);

  return res.status(200).json({
    message: "Conversation connected with seller",
    conversation,
    product,
  });
});

// 6. Make payment for a product requirement
export const payForRequirement = asyncHandler(async (req, res) => {
  const buyerId = req.user.id;
  const { productId, paymentMethod = "CARD" } = req.body;

  if (!productId) {
    return res.status(400).json({ message: "Product ID is required" });
  }

  const product = await prisma.product.findUnique({
    where: { id: Number(productId) },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  if (product.status === "SOLD") {
    return res.status(400).json({ message: "This item has already been sold" });
  }

  if (product.sellerId === buyerId) {
    return res.status(400).json({ message: "You cannot purchase your own product" });
  }

  const sellerId = product.sellerId;
  const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // Create order
  const order = await prisma.order.create({
    data: {
      productId: product.id,
      buyerId,
      sellerId,
      amount: product.price,
      currency: product.currency,
      status: "COMPLETED",
      paymentMethod,
      transactionId,
    },
    include: {
      buyer: {
        select: { id: true, name: true, username: true },
      },
      seller: {
        select: { id: true, name: true, username: true },
      },
      product: true,
    },
  });

  // Mark product as SOLD
  await prisma.product.update({
    where: { id: product.id },
    data: { status: "SOLD" },
  });

  // Ensure conversation exists between buyer and seller
  let conversation = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      participants: {
        every: {
          id: {
            in: [buyerId, sellerId],
          },
        },
        some: {
          id: {
            in: [buyerId, sellerId],
          },
        },
      },
    },
    include: {
      participants: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          email: true,
        },
      },
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        participants: {
          connect: [{ id: buyerId }, { id: sellerId }],
        },
        acceptedUserIds: [buyerId],
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            email: true,
          },
        },
      },
    });
  }

  // Post formal payment confirmation receipt in the chat
  const receiptMessage = `🎉 [PAYMENT COMPLETED]\nBuyer: @${req.user.username}\nItem: ${product.title}\nAmount Paid: $${product.price} ${product.currency}\nPayment Method: ${paymentMethod}\nTransaction ID: ${transactionId}\nStatus: Confirmed & Paid`;

  const message = await prisma.message.create({
    data: {
      content: receiptMessage,
      conversationId: conversation.id,
      SenderId: buyerId,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

  await publishChatEvent("newMessage", conversation.id.toString(), message);

  // Real-time update for both buyer and seller
  const paymentConvPayload = {
    ...conversation,
    messages: [message],
    updatedAt: new Date().toISOString(),
  };
  await publishChatEvent("conversationUpdated", sellerId.toString(), paymentConvPayload);
  await publishChatEvent("conversationUpdated", buyerId.toString(), paymentConvPayload);

  return res.status(200).json({
    message: "Payment successfully processed!",
    order,
    conversationId: conversation.id,
  });
});

