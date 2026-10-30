"use client";

import type { FormEvent } from "react";

export default function DeleteMessageButton({
  id
}: {
  id: string;
}) {
  function confirmDelete(e: FormEvent<HTMLFormElement>) {
    if (!window.confirm(
      "Bạn chắc chắn muốn xóa tin nhắn này khỏi Aura Ops?\n\n" +
      "Thao tác này không xóa vận đơn GHN hoặc tin Facebook."
    )) {
      e.preventDefault();
    }
  }

  return (
    <form
      action="/api/messages/delete"
      method="post"
      onSubmit={confirmDelete}
      style={{ display: "inline-block", marginLeft: 8 }}
    >
      <input type="hidden" name="messageId" value={id} />
      <button
        type="submit"
        style={{
          background: "#fff1f1",
          color: "#b42318",
          border: "1px solid #efc2c2",
          padding: "10px 14px",
          borderRadius: 10,
          cursor: "pointer"
        }}
      >
        Xóa
      </button>
    </form>
  );
}
