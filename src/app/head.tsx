export default function Head() {
  return (
    <>
      {/* Primary favicon */}
      <link rel="icon" href="/fasercon_icon.png" type="image/png" sizes="32x32" />
      {/* Shortcut + Apple touch for broader support */}
      <link rel="shortcut icon" href="/fasercon_icon.png" type="image/png" />
      <link rel="apple-touch-icon" href="/fasercon_icon.png" />

      {/* Basic SEO meta tags */}
      <title>FASERCON — Cubiertas, Estructuras y Revestimientos Metálicos</title>
  <meta name="description" content="FASERCON - Diseño, fabricación e instalación de cubiertas, estructuras y revestimientos metálicos. Proyectos industriales y comerciales en Chile." />
  <meta name="keywords" content="FASERCON, Faseron, cubiertas, estructuras, revestimiento, recubrimiento, techos metálicos" />
      <meta name="robots" content="index,follow" />
      <link rel="canonical" href="https://fasercon.cl/" />

      {/* Open Graph / Social */}
      <meta property="og:title" content="FASERCON — Cubiertas, Estructuras y Revestimientos Metálicos" />
      <meta property="og:description" content="Diseño, fabricación e instalación de cubiertas y estructuras metálicas. Proyectos industriales y comerciales en Chile." />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://fasercon.cl/" />
      <meta property="og:image" content="https://fasercon.cl/fasercon_icon.png" />

      {/* JSON-LD Organization */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "FASERCON",
        "alternateName": ["Faseron"],
        "url": "https://fasercon.cl",
        "logo": "https://fasercon.cl/fasercon_icon.png",
        "sameAs": []
      }) }} />
    </>
  )
}
