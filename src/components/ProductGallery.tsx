import { CheckIcon } from '@heroicons/react/20/solid'

const products = [
  {
    id: 1,
    name: 'Techo Industrial Termoacústico',
    description: 'Láminas metálicas con aislamiento térmico y acústico para naves industriales.',
    image: "https://gbdoqxdldyszmfzqzmuk.supabase.co/storage/v1/object/public/fasercon/images/products/Techo_Industrial.jpeg",
    features: [
      'Aislamiento térmico superior',
      'Reducción de ruido hasta 30dB',
      'Resistente a corrosión',
      'Fácil instalación',
    ],
    applications: ['Fábricas', 'Bodegas', 'Centros logísticos'],
  },
  {
    id: 2,
    name: 'Cubierta Residencial',
    description: 'Soluciones elegantes y duraderas para viviendas y edificaciones residenciales.',
    image: '/api/placeholder/400/300',
    features: [
      'Diseño arquitectónico',
      'Múltiples colores',
      'Garantía 15 años',
      'Bajo mantenimiento',
    ],
    applications: ['Casas', 'Condominios', 'Edificios'],
  },
  {
    id: 3,
    name: 'Revestimiento Metálico',
    description: 'Fachadas metálicas modernas con excelente acabado y durabilidad.',
    image: '/api/placeholder/400/300',
    features: [
      'Acabado premium',
      'Protección UV',
      'Instalación rápida',
      'Diseño personalizado',
    ],
    applications: ['Oficinas', 'Comercios', 'Instituciones'],
  },
]

export default function ProductGallery() {
  return (
    <div id="productos" className="bg-white py-2 sm:py-4">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Nuestros Productos
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Ofrecemos una amplia gama de soluciones en cubiertas y revestimientos metálicos, 
            adaptadas a las necesidades específicas de cada proyecto.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {products.map((product) => (
            <div key={product.id} className="flex flex-col items-start">
              <div className="relative w-full">
                <div 
                  className="aspect-[16/9] w-full rounded-2xl bg-white sm:aspect-[2/1] lg:aspect-[3/2] bg-contain bg-center bg-no-repeat"
                  style={{
                    backgroundImage: product.image.startsWith('http') 
                      ? `url('${product.image}')` 
                      : `linear-gradient(135deg, #e5e7eb 0%, #9ca3af 100%)`
                  }}
                >
                  {!product.image.startsWith('http') && (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-600 font-medium">{product.name}</span>
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 rounded-2xl ring-2 ring-inset ring-gray-900/10" />
              </div>
              <div className="max-w-xl">
                <div className="mt-8 flex items-center gap-x-4 text-xs">
                  {product.applications.map((app, index) => (
                    <span
                      key={index}
                      className="relative z-10 rounded-full bg-red-50 px-3 py-1.5 font-medium text-red-600"
                    >
                      {app}
                    </span>
                  ))}
                </div>
                <div className="group relative">
                  <h3 className="mt-3 text-lg font-semibold leading-6 text-gray-900 group-hover:text-gray-600">
                    {product.name}
                  </h3>
                  <p className="mt-5 line-clamp-3 text-sm leading-6 text-gray-600">
                    {product.description}
                  </p>
                </div>
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-900">Características:</h4>
                  <ul className="mt-3 space-y-2">
                    {product.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <CheckIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6">
                  <button className="rounded-md bg-red-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">
                    Más información
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}