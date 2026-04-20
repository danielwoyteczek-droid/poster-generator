import Image from 'next/image'
import Link from 'next/link'
import { PortableText, type PortableTextComponents } from '@portabletext/react'
import { urlFor } from '@/sanity/client'
import type { SanityImage } from '@/sanity/queries'

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p className="text-gray-700 leading-relaxed my-4">{children}</p>,
    h2: ({ children }) => <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-3">{children}</h2>,
    h3: ({ children }) => <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-2">{children}</h3>,
    h4: ({ children }) => <h4 className="text-lg font-semibold text-gray-900 mt-6 mb-2">{children}</h4>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 my-6 italic text-gray-600">{children}</blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className="list-disc pl-6 my-4 text-gray-700 space-y-1">{children}</ul>,
    number: ({ children }) => <ol className="list-decimal pl-6 my-4 text-gray-700 space-y-1">{children}</ol>,
  },
  listItem: {
    bullet: ({ children }) => <li className="leading-relaxed">{children}</li>,
    number: ({ children }) => <li className="leading-relaxed">{children}</li>,
  },
  marks: {
    strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    underline: ({ children }) => <span className="underline">{children}</span>,
    'strike-through': ({ children }) => <span className="line-through">{children}</span>,
    link: ({ value, children }) => {
      const href = (value as { href?: string; blank?: boolean })?.href ?? '#'
      const blank = (value as { blank?: boolean })?.blank
      const isExternal = /^https?:\/\//.test(href)
      if (isExternal || blank) {
        return (
          <a href={href} target={blank ? '_blank' : undefined} rel={blank ? 'noopener noreferrer' : undefined} className="text-blue-600 underline underline-offset-2 hover:text-blue-800">
            {children}
          </a>
        )
      }
      return (
        <Link href={href} className="text-blue-600 underline underline-offset-2 hover:text-blue-800">
          {children}
        </Link>
      )
    },
  },
  types: {
    image: ({ value }: { value: SanityImage }) => {
      if (!value?.asset) return null
      const url = urlFor(value).width(1400).auto('format').url()
      return (
        <figure className="my-8">
          <Image
            src={url}
            alt={value.alt ?? ''}
            width={1400}
            height={1000}
            className="rounded-lg w-full h-auto"
            style={{ aspectRatio: 'auto' }}
            sizes="(max-width: 768px) 100vw, 800px"
          />
          {value.caption && (
            <figcaption className="text-sm text-gray-500 text-center mt-2">{value.caption}</figcaption>
          )}
        </figure>
      )
    },
    divider: () => <hr className="my-10 border-gray-200" />,
  },
}

export function PortableTextRenderer({ value }: { value: unknown }) {
  if (!value) return null
  return <PortableText value={value as Parameters<typeof PortableText>[0]['value']} components={components} />
}
