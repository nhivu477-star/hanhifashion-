import { SupportChat } from "./support-chat";
import { db } from "@/lib/db";
import { can, assertRolePermission } from "@/lib/rbac";
import { FeedbackForm } from "./feedback-forms";
import { SimpleForm } from "./store";
export async function ProductReviews({ productId }: { productId: string }) {
  const reviews = await db.productReview.findMany({
    where: { productId, hidden: false },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      user: { select: { name: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        select: { id: true, content: true, createdAt: true },
      },
    },
  });
  return (
    <section className="container product-reviews">
      <h2>Đánh giá từ khách đã mua</h2>
      {reviews.length ? (
        reviews.map((r) => (
          <article key={r.id}>
            <p>
              <strong data-localize="off">{r.user.name}</strong> · {r.rating}/5
              · {r.createdAt.toLocaleDateString("vi-VN")}
            </p>
            <p style={{ whiteSpace: "pre-wrap" }}>{r.comment}</p>
            {r.replies.map((reply) => (
              <div className="message" key={reply.id}>
                <strong>Phản hồi từ cửa hàng</strong>
                <p>{reply.content}</p>
              </div>
            ))}
          </article>
        ))
      ) : (
        <p>Chưa có đánh giá từ khách đã mua.</p>
      )}
    </section>
  );
}
export async function OrderReviewForms({
  orderId,
  userId,
}: {
  orderId: string;
  userId: string;
}) {
  const order = await db.order.findFirst({
    where: { id: orderId, userId, status: { in: ["DELIVERED", "COMPLETED"] } },
    include: { items: { where: { quantity: { gt: 0 } } }, reviews: true },
  });
  if (!order) return null;
  const products = [
    ...new Map(order.items.map((i) => [i.productId, i])).values(),
  ];
  return (
    <section>
      <h2>Đánh giá sản phẩm đã nhận</h2>
      {products.map((p) =>
        order.reviews.some((r) => r.productId === p.productId) ? (
          <p key={p.productId}>Đã nhận đánh giá cho {p.name}.</p>
        ) : (
          <details key={p.productId}>
            <summary>Đánh giá {p.name}</summary>
            <FeedbackForm
              action="reviews"
              initial={{ orderId, productId: p.productId }}
              rating
              title={"Nhận xét về " + p.name}
            />
          </details>
        ),
      )}
    </section>
  );
}
export async function FeedbackAdmin({ role }: { role: string }) {
  assertRolePermission(role, "inquiries.read");
  const reviews = await db.productReview.findMany({
    orderBy: { createdAt: "desc" },
    take: 24,
    include: {
      product: { select: { name: true, sku: true } },
      user: { select: { name: true } },
      replies: { orderBy: { createdAt: "asc" } },
    },
  });
  return (
    <section>
      <h2>Đánh giá sản phẩm gần đây</h2>
      {reviews.map((r) => (
        <details key={r.id}>
          <summary>
            {r.product.name} · {r.rating}/5 ·{" "}
            {r.hidden ? "Đã ẩn" : "Đang hiển thị"}
          </summary>
          <p>
            {r.user.name} · {r.product.sku}
          </p>
          <p>{r.comment}</p>
          {r.replies.map((reply) => (
            <p key={reply.id}>{reply.content}</p>
          ))}
          {can(role, "inquiries.manage") && (
            <>
              <FeedbackForm
                action="admin/reviews/reply"
                initial={{ id: r.id }}
                title="Phản hồi công khai từ cửa hàng"
              />
              <SimpleForm
                action="admin/reviews/moderate"
                initial={{ id: r.id, hidden: !r.hidden }}
                submit={r.hidden ? "Hiện lại đánh giá" : "Ẩn đánh giá"}
                fields={[{ name: "reason", label: "Lý do kiểm duyệt" }]}
              />
            </>
          )}
        </details>
      ))}
      {!reviews.length && <p>Chưa có đánh giá cần xử lý.</p>}
    </section>
  );
}
export async function CustomerSupport({ userId, orderId }: { userId: string; orderId?: string }) {
  return <SupportChat userId={userId} orderId={orderId} />;
}
