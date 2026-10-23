import { z } from "zod";
import { orderTransaction } from "./order-lifecycle";
import { requireActorPermission, requireCurrentAccount, operationalAudit } from "./authorization";
import { mutationReceipt } from "./mutation-receipt";
export async function createReview(input: unknown, actor: { id: string; permissionVersion: number }) {
  const d = z
    .object({
      orderId: z.string(),
      productId: z.string(),
      rating: z.coerce.number().int().min(1).max(5),
      comment: z.string().trim().min(3).max(2000),
      eventKey: z.string().uuid(),
    })
    .strict()
    .parse(input);
  return orderTransaction(async (tx) => {
    const user = await requireCurrentAccount(tx, actor);
    if (user.role !== "CUSTOMER")
      throw Error("Chỉ khách mua hàng được gửi đánh giá.");
    const order = await tx.order.findUniqueOrThrow({
      where: { id: d.orderId },
      include: { items: true },
    });
    if (
      order.userId !== user.id ||
      !["DELIVERED", "COMPLETED"].includes(order.status) ||
      !order.items.some((i) => i.productId === d.productId && i.quantity > 0)
    )
      throw Error("Chỉ đánh giá sản phẩm thuộc đơn đã nhận của tài khoản này.");
    const receipt = await mutationReceipt(
      tx,
      "REVIEW_CREATED",
      d.eventKey,
      user.id,
      d,
    );
    if (receipt.replay) return { unchanged: true };
    const old = await tx.productReview.findUnique({
      where: {
        userId_orderId_productId: {
          userId: user.id,
          orderId: order.id,
          productId: d.productId,
        },
      },
    });
    if (old) throw Error("Bạn đã đánh giá sản phẩm trong đơn này.");
    const review = await tx.productReview.create({
      data: {
        userId: user.id,
        orderId: order.id,
        productId: d.productId,
        rating: d.rating,
        comment: d.comment,
      },
    });
    await operationalAudit(
      tx,
      user.id,
      "REVIEW_CREATED",
      "REVIEW",
      review.id,
      null,
      { orderId: order.id, productId: d.productId, rating: d.rating },
      "Đánh giá sau mua",
    );
    await receipt.commit();
    return { id: review.id };
  });
}
export async function replyFeedback(
  kind: "review" | "inquiry",
  input: unknown,
  actor: { id: string; permissionVersion: number },
) {
  const d = z
    .object({
      id: z.string(),
      eventKey: z.string().uuid(),
      content: z.string().trim().min(kind === "inquiry" ? 1 : 3).max(3000),
    })
    .strict()
    .parse(input);
  return orderTransaction(async (tx) => {
    const user = await requireCurrentAccount(tx, actor);
    if (kind === "review")
      await requireActorPermission(tx, actor, "inquiries.manage");
    else {
      const inquiry = await tx.inquiry.findUniqueOrThrow({
        where: { id: d.id },
      });
      if (inquiry.userId !== actor.id)
        await requireActorPermission(tx, actor, "inquiries.manage");
    }
    const receipt = await mutationReceipt(
      tx,
      kind === "review" ? "REVIEW_REPLIED" : "INQUIRY_REPLIED",
      d.eventKey,
      user.id,
      d,
    );
    if (receipt.replay) return { id: d.id, unchanged: true };
    if (kind === "review")
      await tx.reviewReply.create({
        data: {
          reviewId: d.id,
          actorId: actor.id,
          eventKey: d.eventKey,
          content: d.content,
        },
      });
    else {
      await tx.inquiryReply.create({
        data: {
          inquiryId: d.id,
          actorId: actor.id,
          eventKey: d.eventKey,
          content: d.content,
        },
      });
      await tx.inquiry.update({
        where: { id: d.id },
        data: { status: user.role === "CUSTOMER" ? "NEW" : "READ" },
      });
    }
    await operationalAudit(
      tx,
      user.id,
      kind === "review" ? "REVIEW_REPLIED" : "INQUIRY_REPLIED",
      kind.toUpperCase(),
      d.id,
      null,
      { content: d.content },
      "Phản hồi nội dung khách hàng",
    );
    await receipt.commit();
    return { id: d.id };
  });
}
export async function moderateReview(input: unknown, actor: { id: string; permissionVersion: number }) {
  const d = z
    .object({
      id: z.string(),
      hidden: z.boolean(),
      reason: z.string().trim().min(3).max(1000),
    })
    .strict()
    .parse(input);
  return orderTransaction(async (tx) => {
    await requireActorPermission(tx, actor, "inquiries.manage");
    const old = await tx.productReview.findUniqueOrThrow({
      where: { id: d.id },
    });
    await tx.productReview.update({
      where: { id: d.id },
      data: { hidden: d.hidden },
    });
    await operationalAudit(
      tx,
      actor.id,
      "REVIEW_MODERATED",
      "REVIEW",
      d.id,
      { hidden: old.hidden },
      { hidden: d.hidden },
      d.reason,
    );
    return { id: d.id };
  });
}
