import { classifyExpoPushResponse } from "../../../../worker/src/expo-push";

describe("classifyExpoPushResponse", () => {
  it("treats DeviceNotRegistered as unregister without retry", () => {
    const result = classifyExpoPushResponse(200, {
      data: { status: "error", message: "not registered", details: { error: "DeviceNotRegistered" } },
    });
    expect(result).toMatchObject({ ok: false, retry: false, unregister: true });
  });

  it("retries HTTP 5xx", () => {
    const result = classifyExpoPushResponse(503, {});
    expect(result).toMatchObject({ ok: false, retry: true, unregister: false });
  });

  it("retries 429", () => {
    expect(classifyExpoPushResponse(429, {})).toMatchObject({ retry: true, unregister: false });
  });

  it("accepts a successful ticket", () => {
    expect(classifyExpoPushResponse(200, { data: { status: "ok", id: "1" } })).toMatchObject({
      ok: true,
      retry: false,
      unregister: false,
    });
  });
});
