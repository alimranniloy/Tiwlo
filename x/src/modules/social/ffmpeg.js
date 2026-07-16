import ffmpegStatic from 'ffmpeg-static';

export const resolveSocialFfmpegPath = () => {
  const configured = String(process.env.SOCIAL_FFMPEG_PATH || '').trim();
  return configured || ffmpegStatic || 'ffmpeg';
};
