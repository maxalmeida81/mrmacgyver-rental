
const EMAIL_TO = "mrmacgyver@mrmacgyver.com";
const EMAIL_FROM = "Mr. MacGyver Rental <quotes@notifications.mrmacgyver.com>";

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));

export async function onRequestPost({ request, env }) {
  try {
    if (!env.RESEND_API_KEY) {
      return Response.json(
        { error: "Email service not configured." },
        { status: 500 }
      );
    }

    const type = request.headers.get("content-type") || "";
    let data;

    if (type.includes("application/json")) {
      data = await request.json();
    } else if (type.includes("form")) {
      data = Object.fromEntries(await request.formData());
    } else {
      return Response.json(
        { error: "Unsupported content type." },
        { status: 415 }
      );
    }

    const name = String(data.name || "").trim();
    const email = String(data.email || "").trim();
    const phone = String(data.phone || "").trim();
    const eventType = String(data.eventType || "").trim();
    const eventDate = String(data.eventDate || "").trim();
    const location = String(data.location || "").trim();
    const message = String(data.message || "").trim();

    if (!name || !email || !message ||
        name.length > 150 || email.length > 254 ||
        message.length > 5000 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json(
        { error: "Please complete the required fields." },
        { status: 400 }
      );
    }

    const fields = {
      Name: name,
      Email: email,
      Phone: phone,
      "Event type": eventType,
      "Event date": eventDate,
      Location: location,
      Message: message
    };

    const html = `
      <h2>New LED Wall Rental Inquiry</h2>
      ${Object.entries(fields).map(([key, value]) =>
        `<p><strong>${escapeHtml(key)}:</strong>
        ${escapeHtml(value)}</p>`
      ).join("")}
    `;

    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [EMAIL_TO],
        reply_to: email,
        subject: `New Rental Inquiry - ${name}`,
        html
      })
    });

    if (!result.ok) {
      console.error("Resend error:", result.status);
      return Response.json(
        { error: "Unable to send your request." },
        { status: 502 }
      );
    }

    return Response.json({
      success: true,
      message: "Your quote request has been sent!"
    });

  } catch (error) {
    console.error("Quote request error:", error);
    return Response.json(
      { error: "Unable to process your request." },
      { status: 500 }
    );
  }
}
