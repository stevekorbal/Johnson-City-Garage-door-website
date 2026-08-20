import { servicesData } from '../data/servicesData';
import { citiesData } from '../data/citiesData';
import { getPostBySlug } from './blog';

export interface RouteSeoData {
  title: string;
  description: string;
  canonicalUrl: string;
  schemaJson: any;
  ogImage: string;
  ogType: string;
}

export function getBaseDomain(): string {
  let domain = '';
  if (typeof process !== 'undefined' && process.env) {
    domain = process.env.VITE_SITE_URL || process.env.SITE_URL || process.env.VITE_DOMAIN || '';
  }
  if (!domain && typeof window !== 'undefined' && window.location && window.location.origin) {
    const origin = window.location.origin;
    if (!origin.includes('localhost') && !origin.includes('127.0.0.1') && !origin.includes('run.app')) {
      domain = origin;
    }
  }
  if (!domain) {
    domain = 'https://www.garagedoorrepairjohnsoncity.com';
  }
  if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
    domain = `https://${domain}`;
  }
  return domain.replace(/\/+$/, '');
}

export function getRouteSeoData(rawPath: string): RouteSeoData {
  const cleanPath = (rawPath || '').replace(/^\/|\/$/g, '') || 'home';
  const baseDomain = getBaseDomain();
  const canonicalUrl = `${baseDomain}/${cleanPath === 'home' || cleanPath === '' ? '' : cleanPath}`;
  const defaultOgImage = `${baseDomain}/images/garage-door-repair.webp`;

  const defaultLocalBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    '@id': `${baseDomain}/#business`,
    'name': 'Johnson City Garage Door Repair',
    'image': defaultOgImage,
    'url': `${baseDomain}/`,
    'telephone': '+14236721770',
    'email': 'contact@garagedoorrepairjohnsoncity.com',
    'priceRange': '$$',
    'currenciesAccepted': 'USD',
    'paymentAccepted': 'Cash, Credit Card, Check',
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': '120 W Spring St',
      'addressLocality': 'Johnson City',
      'addressRegion': 'TN',
      'postalCode': '37604',
      'addressCountry': 'US'
    },
    'geo': {
      '@type': 'GeoCoordinates',
      'latitude': 36.3134397,
      'longitude': -82.3927238
    },
    'openingHoursSpecification': {
      '@type': 'OpeningHoursSpecification',
      'dayOfWeek': [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday'
      ],
      'opens': '00:00',
      'closes': '23:59'
    },
    'areaServed': [
      { '@type': 'AdministrativeArea', 'name': 'Johnson City, TN' },
      { '@type': 'AdministrativeArea', 'name': 'Kingsport, TN' },
      { '@type': 'AdministrativeArea', 'name': 'Bristol, TN' },
      { '@type': 'AdministrativeArea', 'name': 'Elizabethton, TN' },
      { '@type': 'AdministrativeArea', 'name': 'Jonesborough, TN' },
      { '@type': 'AdministrativeArea', 'name': 'Erwin, TN' },
      { '@type': 'AdministrativeArea', 'name': 'Piney Flats, TN' },
      { '@type': 'AdministrativeArea', 'name': 'Gray, TN' }
    ]
  };

  let cleanServiceId = '';
  if (cleanPath.startsWith('service/')) {
    cleanServiceId = cleanPath.split('/')[1];
  } else if (servicesData[cleanPath]) {
    cleanServiceId = cleanPath;
  }

  if (cleanServiceId && servicesData[cleanServiceId]) {
    const service = servicesData[cleanServiceId];
    const title = service.metaTitle || `${service.title} | Johnson City Garage Door Repair`;
    const description = service.metaDescription || service.shortDesc;

    const mainSchema = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': service.title.split('|')[0].trim(),
      'description': service.shortDesc,
      'provider': defaultLocalBusinessSchema,
      'areaServed': defaultLocalBusinessSchema.areaServed
    };

    const breadcrumbsSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        {
          '@type': 'ListItem',
          'position': 1,
          'name': 'Home',
          'item': `${baseDomain}/`
        },
        {
          '@type': 'ListItem',
          'position': 2,
          'name': service.title,
          'item': canonicalUrl
        }
      ]
    };

    let schemas: any[] = [defaultLocalBusinessSchema, mainSchema, breadcrumbsSchema];

    if (service.faqs && service.faqs.length > 0) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': service.faqs.map(faq => ({
          '@type': 'Question',
          'name': faq.question,
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': faq.answer
          }
        }))
      });
    }

    return {
      title,
      description,
      canonicalUrl,
      schemaJson: schemas,
      ogImage: defaultOgImage,
      ogType: 'website'
    };
  }

  let cleanCityId = '';
  if (cleanPath.startsWith('city/')) {
    cleanCityId = cleanPath.split('/')[1].replace(/-tn$/, '');
  } else if (cleanPath.startsWith('garage-door-repair-') && cleanPath.endsWith('-tn')) {
    cleanCityId = cleanPath.replace(/^garage-door-repair-/, '').replace(/-tn$/, '');
  } else if (citiesData[cleanPath]) {
    cleanCityId = cleanPath;
  }

  if (cleanCityId && citiesData[cleanCityId]) {
    const city = citiesData[cleanCityId];
    if (city) {
      const title = city.metaTitle || `Garage Door Repair ${city.cityName} | Same-Day Service`;
      const description = city.metaDescription || city.intro;

      const cityBusinessSchema = {
        '@context': 'https://schema.org',
        '@type': 'HomeAndConstructionBusiness',
        '@id': `${canonicalUrl}#local-service`,
        'name': `Johnson City Garage Door Repair - ${city.cityName}`,
        'description': city.intro,
        'telephone': '+14236721770',
        'email': 'contact@garagedoorrepairjohnsoncity.com',
        'priceRange': '$$',
        'url': canonicalUrl,
        'image': defaultOgImage,
        'address': {
          '@type': 'PostalAddress',
          'addressLocality': city.cityName.split(',')[0].trim(),
          'addressRegion': 'TN',
          'addressCountry': 'US'
        }
      };

      const breadcrumbsSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': 'Home',
            'item': `${baseDomain}/`
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': 'Service Areas',
            'item': `${baseDomain}/service-areas`
          },
          {
            '@type': 'ListItem',
            'position': 3,
            'name': city.cityName,
            'item': canonicalUrl
          }
        ]
      };

      return {
        title,
        description,
        canonicalUrl,
        schemaJson: [defaultLocalBusinessSchema, cityBusinessSchema, breadcrumbsSchema],
        ogImage: defaultOgImage,
        ogType: 'website'
      };
    }
  }

  if (cleanPath.startsWith('blog/')) {
    const slug = cleanPath.replace(/^blog\//, '');
    const post = getPostBySlug(slug);
    if (post) {
      const title = `${post.title} | Johnson City Garage Door Repair`;
      const description = post.description;
      const postImage = post.featuredImage.startsWith('http')
        ? post.featuredImage
        : `${baseDomain}${post.featuredImage.startsWith('/') ? '' : '/'}${post.featuredImage}`;

      const blogSchema = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        'headline': post.title,
        'description': post.description,
        'image': [postImage],
        'datePublished': post.date,
        'dateModified': post.updatedDate || post.date,
        'author': {
          '@type': 'Organization',
          'name': post.author || 'Johnson City Garage Door Repair'
        },
        'publisher': {
          '@type': 'Organization',
          'name': 'Johnson City Garage Door Repair',
          'logo': {
            '@type': 'ImageObject',
            'url': `${baseDomain}/images/garage-door-repair.webp`
          }
        },
        'mainEntityOfPage': {
          '@type': 'WebPage',
          '@id': canonicalUrl
        }
      };

      const breadcrumbsSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': 'Home',
            'item': `${baseDomain}/`
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': 'Blog',
            'item': `${baseDomain}/blog`
          },
          {
            '@type': 'ListItem',
            'position': 3,
            'name': post.title,
            'item': canonicalUrl
          }
        ]
      };

      return {
        title,
        description,
        canonicalUrl,
        schemaJson: [defaultLocalBusinessSchema, blogSchema, breadcrumbsSchema],
        ogImage: postImage,
        ogType: 'article'
      };
    }
  }

  switch (cleanPath) {
    case 'blog': {
      return {
        title: 'Blog & Repair Guides | Johnson City Garage Door Repair',
        description: 'Expert garage door repair guides, spring replacement cost breakdowns, and opener troubleshooting tips for Johnson City, TN and surrounding homeowners.',
        canonicalUrl,
        schemaJson: [
          defaultLocalBusinessSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            'name': 'Garage Door Repair Guides & Tips',
            'description': 'Helpful repair guides and advice for East Tennessee homeowners.'
          }
        ],
        ogImage: defaultOgImage,
        ogType: 'website'
      };
    }
    case 'about': {
      return {
        title: 'About Us | Johnson City Garage Door Repair Johnson City TN',
        description: 'Learn about Johnson City Garage Door Repair in Johnson City, TN. Licensed, bonded, and insured local overhead door specialists.',
        canonicalUrl,
        schemaJson: [
          defaultLocalBusinessSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            'name': 'About Johnson City Garage Door Repair'
          }
        ],
        ogImage: defaultOgImage,
        ogType: 'website'
      };
    }
    case 'why-choose-us': {
      return {
        title: 'Why Choose Us | Johnson City Garage Door Repair Johnson City TN',
        description: 'Discover why homeowners and businesses in Johnson City, TN trust us for their garage door repairs and installations. Same-day service, clear warranties.',
        canonicalUrl,
        schemaJson: [defaultLocalBusinessSchema],
        ogImage: defaultOgImage,
        ogType: 'website'
      };
    }
    case 'service-areas': {
      return {
        title: 'Service Areas | Garage Door Repair in Johnson City TN',
        description: 'We proudly serve Johnson City, Kingsport, Bristol, Elizabethton, Jonesborough, Erwin, Piney Flats, Gray, and surrounding East Tennessee communities.',
        canonicalUrl,
        schemaJson: [defaultLocalBusinessSchema],
        ogImage: defaultOgImage,
        ogType: 'website'
      };
    }
    case 'faqs': {
      return {
        title: 'Frequently Asked Questions | Garage Door Repair Johnson City TN',
        description: 'Got questions about broken springs, opener issues, or new door installations? Check out our helpful FAQs or call today for immediate help.',
        canonicalUrl,
        schemaJson: [defaultLocalBusinessSchema],
        ogImage: defaultOgImage,
        ogType: 'website'
      };
    }
    case 'contact': {
      return {
        title: 'Contact Us | Johnson City Garage Door Repair Johnson City TN',
        description: 'Get in touch with our local team for emergency repairs or free estimates in Johnson City, TN. We\'re available 24/7 at (423) 672-1770.',
        canonicalUrl,
        schemaJson: [
          defaultLocalBusinessSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'ContactPage',
            'name': 'Contact Johnson City Garage Door Repair'
          }
        ],
        ogImage: defaultOgImage,
        ogType: 'website'
      };
    }
    case 'privacy-policy': {
      return {
        title: 'Privacy Policy | Johnson City Garage Door Repair',
        description: 'Read our privacy policy to understand how we protect your information when you contact us for garage door services.',
        canonicalUrl,
        schemaJson: [defaultLocalBusinessSchema],
        ogImage: defaultOgImage,
        ogType: 'website'
      };
    }
    case 'terms-and-conditions': {
      return {
        title: 'Terms & Conditions | Johnson City Garage Door Repair',
        description: 'Review our service terms and conditions for residential and commercial garage door services.',
        canonicalUrl,
        schemaJson: [defaultLocalBusinessSchema],
        ogImage: defaultOgImage,
        ogType: 'website'
      };
    }
    default: {
      return {
        title: 'Garage Door Repair Johnson City TN | Same-Day Service',
        description: 'Need garage door repair in Johnson City, TN? Get fast service for broken springs, garage door openers, installations and emergency repairs. Call today.',
        canonicalUrl,
        schemaJson: defaultLocalBusinessSchema,
        ogImage: defaultOgImage,
        ogType: 'website'
      };
    }
  }
}
