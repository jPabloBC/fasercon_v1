const projects = [
  {
    id: 1,
    title: 'Centro Logístico Industrial',
    location: 'Iquique, Chile',
    area: '5,200 m²',
    type: 'Industrial',
    description: 'Cubierta industrial con láminas termoacústicas y estructura de acero galvanizado.',
    image: '/api/placeholder/600/400',
    features: ['Láminas termoacústicas', 'Estructura galvanizada', 'Sistema de evacuación de aguas'],
    year: '2024',
  },
  {
    id: 2,
    title: 'Conjunto Residencial Las Palmas',
    location: 'Antofagasta, Chile',
    area: '1,800 m²',
    type: 'Residencial',
    description: 'Techos metálicos para 45 viviendas con diseño arquitectónico personalizado.',
    image: '/api/placeholder/600/400',
    features: ['Tejas metálicas', 'Múltiples colores', 'Garantía 15 años'],
    year: '2024',
  },
  {
    id: 3,
    title: 'Planta de Producción Alimentaria',
    location: 'Calama, Chile',
    area: '3,400 m²',
    type: 'Industrial',
    description: 'Cubierta especializada para industria alimentaria con normativas sanitarias.',
    image: '/api/placeholder/600/400',
    features: ['Paneles sandwich', 'Aislamiento térmico', 'Normas sanitarias'],
    year: '2023',
  },
  {
    id: 4,
    title: 'Centro Comercial Plaza Norte',
    location: 'Santiago, Chile',
    area: '2,100 m²',
    type: 'Comercial',
    description: 'Revestimiento y cubierta para área de plaza de comidas.',
    image: '/api/placeholder/600/400',
    features: ['Revestimiento decorativo', 'Iluminación integrada', 'Diseño moderno'],
    year: '2023',
  },
]

export default function ProjectGallery() {
  return (
    <div id="proyectos" className="bg-gray-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Proyectos Destacados
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Conoce algunos de nuestros proyectos más destacados en diferentes sectores, 
            desde instalaciones industriales hasta desarrollos residenciales.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
          {projects.map((project) => (
            <div key={project.id} className="group relative">
              <div className="relative h-80 w-full overflow-hidden rounded-lg bg-white sm:aspect-h-1 sm:aspect-w-2 lg:aspect-h-1 lg:aspect-w-1 group-hover:opacity-75 sm:h-64">
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-400 flex items-center justify-center">
                  <div className="text-center text-gray-600">
                    <h4 className="font-semibold text-lg">{project.title}</h4>
                    <p className="text-sm mt-2">{project.area}</p>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {project.title}
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-700/10">
                    {project.type}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{project.location} • {project.year}</p>
                <p className="mt-3 text-sm leading-6 text-gray-600">{project.description}</p>
                
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-900">Características del proyecto:</h4>
                  <ul className="mt-2 space-y-1">
                    {project.features.map((feature, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        • {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-semibold text-gray-900">Área: </span>
                    <span className="text-gray-600">{project.area}</span>
                  </div>
                  <button className="text-sm font-semibold text-red-600 hover:text-red-500">
                    Ver detalles →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <p className="text-lg text-gray-600 mb-6">
            ¿Tienes un proyecto similar en mente?
          </p>
          <a
            href="#cotizador"
            className="rounded-md bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            Cotizar mi proyecto
          </a>
        </div>
      </div>
    </div>
  )
}