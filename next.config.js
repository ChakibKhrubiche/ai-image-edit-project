/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
//import "./src/env.js";

///** @type {import("next").NextConfig} */
//const config = {};

//export default config;

import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'd2p7pge43lyniu.cloudfront.net',
        port: '',
        pathname: '/output/**',
      },
      // Pattern générique pour tous les domaines CloudFront
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default config;