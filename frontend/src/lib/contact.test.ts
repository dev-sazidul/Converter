import { describe, expect, it } from "vitest";
import { validateContactInput } from "@/lib/contact";

describe("validateContactInput", () => {
  const base = {
    name: "Zara Test",
    email: "Zara@Example.com",
    subject: "PDF merge question",
    message: "Hello, I had a question about merging two PDF files.",
    website: "",
    formStartedAt: 1000,
  };

  it("accepts and normalizes valid submissions", () => {
    const res = validateContactInput(base, 5000);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.name).toBe("Zara Test");
      expect(res.data.email).toBe("zara@example.com");
      expect(res.data.subject).toBe("PDF merge question");
    }
  });

  it("rejects honeypot spam", () => {
    const res = validateContactInput({ ...base, website: "https://spam.example" }, 5000);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("spam_detected");
  });

  it("rejects instant bot submissions", () => {
    const res = validateContactInput({ ...base, formStartedAt: 4500 }, 5000);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("spam_detected");
  });

  it("rejects invalid emails and short messages", () => {
    const badEmail = validateContactInput({ ...base, email: "not-an-email" }, 5000);
    expect(badEmail.ok).toBe(false);
    if (!badEmail.ok) expect(badEmail.field).toBe("email");

    const shortMsg = validateContactInput({ ...base, message: "hi" }, 5000);
    expect(shortMsg.ok).toBe(false);
    if (!shortMsg.ok) expect(shortMsg.field).toBe("message");
  });

  it("rejects messages with excessive links", () => {
    const res = validateContactInput(
      {
        ...base,
        message: "Check https://a.com https://b.com https://c.com https://d.com https://e.com https://f.com",
      },
      5000,
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("spam_detected");
  });
});
