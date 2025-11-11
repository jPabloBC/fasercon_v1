import Image from 'next/image'

export default function EstructurasPage() {
  return (
    <main className="w-[95%] mx-auto py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Estructuras Metálicas</h1>
        <p className="text-gray-700 mb-6">
          Fabricamos estructuras metálicas para soporte de equipos, pasarelas, plataformas y naves industriales.
          Trabajamos con acero estructural, perfiles personalizados y tratamientos superficiales según especificación.
        </p>

        <div className="relative w-full h-64 rounded-lg overflow-hidden mb-6">
          <Image
            src="/assets/images/clima_01.jpg"
            alt="Estructuras metálicas FASERCON"
            fill
            className="object-cover"
            sizes="100vw"
          />
        </div>

        <h2 className="text-2xl font-semibold mt-6 mb-2">Qué ofrecemos</h2>
        <ul className="list-disc ml-6 text-gray-700">
          <li>Proyectos a medida con ingeniería de detalle.</li>
          <li>Soldadura y control de calidad certificado.</li>
          <li>Tratamientos anticorrosivos y pinturas industriales.</li>
          <li>Montaje y montaje electromecánico en obra.</li>
        </ul>

        <p className="text-gray-700 mt-6">
          Si necesitas una solución robusta y confiable para tus estructuras, escríbenos y coordinamos una visita.
        </p>
      </div>
    </main>
  )
}
