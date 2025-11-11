import Image from 'next/image'

export default function CubiertasPage() {
  return (
    <main className="w-[95%] mx-auto py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Cubiertas y Revestimientos Metálicos</h1>
        <p className="text-gray-700 mb-6">
          En FASERCON fabricamos, suministramos e instalamos cubiertas metálicas y sistemas de revestimiento para
          naves industriales, bodegas y proyectos comerciales. Nuestra experiencia abarca chapa trapezoidal, panel
          sándwich y revestimientos con garantía de estanqueidad y terminaciones profesionales.
        </p>

        <div className="relative w-full h-64 rounded-lg overflow-hidden mb-6">
          <Image
            src="/assets/images/clima_01.jpg"
            alt="Cubiertas metálicas FASERCON"
            fill
            className="object-cover"
            sizes="100vw"
          />
        </div>

        <h2 className="text-2xl font-semibold mt-6 mb-2">Servicios incluidos</h2>
        <ul className="list-disc ml-6 text-gray-700">
          <li>Diseño y fabricación a medida de chapas y estructuras de soporte.</li>
          <li>Instalación y puesta en obra con equipos certificados.</li>
          <li>Sistemas de aislamiento y control de condensación.</li>
          <li>Mantenimiento y reparaciones de sistemas existentes.</li>
        </ul>

        <p className="text-gray-700 mt-6">
          Contáctanos para evaluar tu proyecto y recibir una cotización personalizada. Podemos realizar visitas
          técnicas, elaborar planos y ofrecer soluciones optimizadas en costo y tiempo de ejecución.
        </p>
      </div>
    </main>
  )
}
