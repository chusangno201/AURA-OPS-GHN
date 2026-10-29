"use client";

import { useEffect, useState } from "react";

type Station = {
  id: number;
  name: string;
  address: string;
  district: string;
};

export default function GhnPickupSelector() {
  const [mode, setMode] = useState<"pickup" | "dropoff">("pickup");
  const [stations, setStations] = useState<Station[]>([]);
  const [stationId, setStationId] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shopAddress, setShopAddress] = useState("");

  useEffect(() => {
    if (mode !== "dropoff") return;

    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");
      setStations([]);
      setStationId("");

      try {
        const res = await fetch("/api/ghn/stations", {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Không tải được bưu cục");
        }

        setStations(data.stations || []);
        setShopAddress(data.shop?.address || "");

        if (!data.stations?.length) {
          setError("Không tìm thấy bưu cục ở khu vực kho.");
        }
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Lỗi GHN");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [mode]);

  return (
    <div className="wide" style={{
      border: "1px solid #e8ded5",
      borderRadius: 14,
      padding: 18
    }}>
      <strong>Hình thức gửi hàng GHN</strong>

      <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
        <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="radio"
            name="pickupMode"
            value="pickup"
            checked={mode === "pickup"}
            onChange={() => {
              setMode("pickup");
              setStationId("0");
            }}
          />
          GHN đến lấy hàng tận nơi
        </label>

        <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="radio"
            name="pickupMode"
            value="dropoff"
            checked={mode === "dropoff"}
            onChange={() => setMode("dropoff")}
          />
          Tôi tự mang hàng đến bưu cục GHN
        </label>
      </div>

      <input
        type="hidden"
        name="pickStationId"
        value={mode === "pickup" ? "0" : stationId}
      />

      {mode === "dropoff" && (
        <div style={{ marginTop: 16 }}>
          {shopAddress && (
            <p style={{ fontSize: 13 }}>
              <b>Kho GHN:</b> {shopAddress}
            </p>
          )}

          {loading && <p>Đang tải bưu cục GHN...</p>}

          {error && (
            <p role="alert" style={{ color: "#b42318" }}>
              {error}
            </p>
          )}

          {!loading && stations.length > 0 && (
            <>
              <p style={{ fontSize: 13, marginBottom: 8 }}>
                Chọn điểm gửi trong khu vực kho:
              </p>

              <select
                aria-label="Chọn bưu cục GHN"
                value={stationId}
                onChange={e => setStationId(e.target.value)}
                required
              >
                <option value="">-- Chọn bưu cục --</option>
                {stations.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.address}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      )}
    </div>
  );
}
