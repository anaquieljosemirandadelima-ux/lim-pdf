export const ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-2957538365374258";

export const ADSENSE_PUBLISHER_ID =
  process.env.ADSENSE_PUBLISHER_ID || ADSENSE_CLIENT.replace("ca-pub-", "");

export const ADSENSE_SCRIPT_SRC =
  `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
