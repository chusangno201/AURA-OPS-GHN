const allowed = /^https:\/\/(dev-online-gateway|online-gateway)\.ghn\.vn$/;

function config() {
  const base = process.env.GHN_BASE_URL ||
    "https://dev-online-gateway.ghn.vn";
  const token = process.env.GHN_TOKEN;
  const shopId = process.env.GHN_SHOP_ID;

  if (!allowed.test(base) || !token || !shopId) {
    throw new Error("Cấu hình GHN không hợp lệ");
  }
  return { base, token, shopId };
}

export type GhnStation = {
  id: number;
  name: string;
  address: string;
  district: string;
};

export async function getGhnStations() {
  const { base, token, shopId } = config();

  // Lấy địa chỉ kho từ GHN, không lấy từ khách nhận.
  const shopResponse = await fetch(
    `${base}/shiip/public-api/v2/shop/all?offset=0&limit=200`,
    { headers: { Token: token }, cache: "no-store" }
  );

  const shopData = await shopResponse.json();

  if (!shopResponse.ok || shopData.code !== 200) {
    throw new Error(shopData.message || "Không đọc được kho GHN");
  }

  const shop = (shopData.data?.shops || []).find(
    (x: { _id: number }) => String(x._id) === shopId
  );

  if (!shop?.district_id) {
    throw new Error("Không tìm thấy quận/huyện của kho GHN");
  }

  const params = new URLSearchParams({
    district_id: String(shop.district_id),
    offset: "0",
    limit: "100",
  });

  const response = await fetch(
    `${base}/shiip/public-api/v2/station/get?${params}`,
    {
      headers: {
        Token: token,
        ShopId: shopId,
      },
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok || data.code !== 200) {
    throw new Error(
      data.code_message === "SECURITY_CHECK_FAILED"
        ? "GHN yêu cầu quyền tra cứu bưu cục/CAPTCHA. Liên hệ GHN."
        : data.message || "Không lấy được danh sách bưu cục"
    );
  }

  if (!Array.isArray(data.data)) {
    throw new Error("Dữ liệu bưu cục GHN không hợp lệ");
  }

  const stations: GhnStation[] = data.data
    .filter((x: { locationId: number }) =>
      Number.isInteger(Number(x.locationId)) &&
      Number(x.locationId) > 0
    )
    .map((x: {
      locationId: number;
      locationName: string;
      address: string;
      districtName?: string;
    }) => ({
      id: Number(x.locationId),
      name: x.locationName || "Bưu cục GHN",
      address: x.address || "",
      district: x.districtName || "",
    }));

  return {
    shop: {
      id: shop._id,
      name: shop.name,
      address: shop.address,
    },
    stations,
  };
}
