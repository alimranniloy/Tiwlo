import { motion } from 'motion/react';
import React from 'react';
import { Link } from 'react-router-dom';
import { useStorefrontRuntime } from '../../../shared/storefrontRuntime';
import { eplazaBanners } from '../themeData';
import { Article } from '../types';

export const ApplePromotion = () => {
  const { allowFallbackData, getRecords, themePath } = useStorefrontRuntime();
  const record = getRecords('homepage-banners').find((item) => item.data?.slot === 'apple-event');
  if (!record && !allowFallbackData) return null;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
      <div className="relative flex min-h-[500px] items-center overflow-hidden rounded-[10px] bg-[#f5f5f7] p-10 lg:p-24">
        <div className="relative z-10 flex max-w-2xl flex-col items-start text-left">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold leading-tight tracking-tight text-[#101010]/90 lg:text-7xl"
          >
            {record?.data?.headline || 'Apple Shopping Event'}
          </motion.h2>
          <p className="mt-6 text-xl font-medium text-text-muted">
            {record?.data?.text || 'Hurry and get discounts on all Apple devices up to 20%'}
          </p>

          <div className="mt-10 flex gap-6">
            {[
              { val: '228', label: 'Days' },
              { val: '06', label: 'Hr' },
              { val: '49', label: 'Min' },
              { val: '53', label: 'Sec' }
            ].map((item) => (
              <div key={item.label} className="text-center">
                <span className="text-3xl font-bold text-[#101010]/90 lg:text-5xl">{item.val}</span>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-text-muted">{item.label}</p>
              </div>
            ))}
          </div>

          <Link to={themePath(record?.data?.actionLink || 'search')} className="group mt-12 flex items-center gap-2 rounded-full bg-primary px-12 py-4 text-[13px] font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-opacity-90">
            {record?.data?.actionText || 'Go Shopping'} <span className="text-lg leading-none transition-transform group-hover:translate-x-1">&gt;</span>
          </Link>
        </div>

        <div className="pointer-events-none absolute bottom-0 right-0 hidden h-full w-1/2 items-end justify-end p-12 lg:flex">
          <img
            src={record?.data?.image || eplazaBanners.appleEvent}
            alt="Apple Promo"
            className="max-h-[90%] object-contain"
          />
        </div>
      </div>
    </div>
  );
};

const articles: Article[] = [
  {
    id: '1',
    title: 'Best Gaming Laptop Models',
    excerpt: 'Premium gaming laptops, cooling systems, and GPU choices for modern players.',
    category: 'Gaming, Laptops',
    date: '14 Nov 2022',
    author: 'Store Team',
    image: '/uploads/eplaza/best-gaming-laptop-model-entry-header.jpg.webp'
  },
  {
    id: '2',
    title: 'How to choose a HI-FI stereo system',
    excerpt: 'A clear guide to speakers, amplifiers, and room-friendly audio setup decisions.',
    category: 'HI-FI Sound',
    date: '14 Nov 2022',
    author: 'Store Team',
    image: '/uploads/eplaza/how-to-choose-a-hi-fi-stereo-system-entry-header.jpg.webp'
  },
  {
    id: '3',
    title: 'Logitech POP Keys',
    excerpt: 'Colorful wireless keyboards and the small details that improve daily typing.',
    category: 'Keyboards',
    date: '11 Nov 2022',
    author: 'Store Team',
    image: '/uploads/eplaza/logitech-pop-keys-entry-header.jpg.webp'
  }
];

export const BlogSection = () => {
  const { allowFallbackData, getRecords } = useStorefrontRuntime();
  const postRecords = getRecords('blog-posts');
  const rows: Article[] = postRecords.length ? postRecords.slice(0, 3).map((record, index) => ({
    id: record.id,
    title: record.data?.title || record.title,
    excerpt: record.data?.excerpt || record.data?.summary || 'Latest storefront editorial story.',
    category: record.data?.category || 'Eplaza',
    date: record.data?.date || 'Recently',
    author: record.data?.author || 'Store Team',
    image: record.data?.image || articles[index % articles.length].image
  })) : (allowFallbackData ? articles : []);

  if (!rows.length) return null;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-20 lg:px-8">
      <div className="relative mb-16 text-center">
        <h2 className="relative z-10 inline-block bg-page-bg px-8 text-3xl font-bold uppercase tracking-tight text-[#101010]/90">Our Articles</h2>
        <div className="absolute left-0 right-0 top-1/2 h-[1.5px] bg-gray-200" />
      </div>
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((article) => (
          <motion.article
            key={article.id}
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="group cursor-pointer overflow-hidden rounded-[10px] border border-transparent bg-white transition-all hover:shadow-xl"
          >
            <div className="relative aspect-[16/10] overflow-hidden">
              <img
                src={article.image}
                alt={article.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
            </div>
            <div className="space-y-4 p-8">
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[#aaa]">
                <span className="text-primary">{article.category}</span>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span>{article.date}</span>
              </div>
              <h3 className="line-clamp-2 text-xl font-bold leading-snug text-[#101010]/90 transition-colors group-hover:text-primary">
                {article.title}
              </h3>
              <p className="line-clamp-2 text-[14px] leading-relaxed text-text-muted">
                {article.excerpt}
              </p>
              <div className="pt-4">
                <button className="group/btn flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-text-main">
                  <span className="relative">
                    Continue Reading
                    <span className="absolute -bottom-1 left-0 h-[1px] w-full origin-left scale-x-100 bg-primary transition-transform group-hover/btn:scale-x-50" />
                  </span>
                  <span className="text-lg leading-none text-primary">&gt;</span>
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
};
