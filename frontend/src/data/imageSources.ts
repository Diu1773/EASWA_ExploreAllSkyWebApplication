import astroFallback from '../assets/hero.png';
import kmtnetBanner from '../assets/kmtnet.png';
import kmtnetCtio from '../assets/kmt-ctio.jpg';
import kmtnetMicrolensingNasa from '../assets/kmt-microlensing-nasa.jpg';
import kmtnetSaao from '../assets/kmt-saao.jpg';
import kmtnetSso from '../assets/kmt-sso.jpg';
import tessNasaPreview from '../assets/tess-nasa-preview.png';
import clusterModuleImg from '../assets/cluster-m45-pleiades.jpg';

export const ASTRO_FALLBACK_IMAGE = astroFallback;

export const HOME_HERO_BG =
  'https://cdn.esahubble.org/archives/images/screen/heic0406a.jpg';
export const TESS_MODULE_IMAGE = tessNasaPreview;
export const CLUSTER_MODULE_IMAGE = clusterModuleImg;
export const KMT_MODULE_IMAGE = kmtnetBanner;
export const KMT_BANNER_IMAGE = kmtnetMicrolensingNasa;

export const KMT_SITE_IMAGES: Record<'ctio' | 'saao' | 'sso', string> = {
  ctio: kmtnetCtio,
  saao: kmtnetSaao,
  sso: kmtnetSso,
};
