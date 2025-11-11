"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from 'next/image'

const clients = [
	{
		id: 1,
		name: "AVA Montajes",
		logo: "https://gbdoqxdldyszmfzqzmuk.supabase.co/storage/v1/object/public/fasercon/images/clients/ava.png",
		works: [
			"https://gbdoqxdldyszmfzqzmuk.supabase.co/storage/v1/object/public/fasercon/images/clients/background/bg01.webp",
			"https://gbdoqxdldyszmfzqzmuk.supabase.co/storage/v1/object/public/fasercon/images/clients/background/bg02.webp",
		],
	},
	{
		id: 2,
		name: "MPM",
		logo: "https://gbdoqxdldyszmfzqzmuk.supabase.co/storage/v1/object/public/fasercon/images/clients/mpm.png",
		works: [
			"",
			"",
		],
	},
	{
		id: 3,
		name: "Cerro Nevado",
		logo: "https://gbdoqxdldyszmfzqzmuk.supabase.co/storage/v1/object/public/fasercon/images/clients/cerro_nevado.png",
		works: [
			"",
			"",
		],
	},
	{
		id: 4,
		name: "EPSA Group",
		logo: "https://gbdoqxdldyszmfzqzmuk.supabase.co/storage/v1/object/public/fasercon/images/clients/epsa.png",
		works: [
			"",
			"",
		],
	},
    {
		id: 5,
		name: "Stracon",
		logo: "https://gbdoqxdldyszmfzqzmuk.supabase.co/storage/v1/object/public/fasercon/images/clients/stracon.png",
		works: [
			"",
			"",
		],
	},
    {
		id: 6,
		name: "Centinela",
		logo: "https://gbdoqxdldyszmfzqzmuk.supabase.co/storage/v1/object/public/fasercon/images/clients/centinela.png",
		works: [
			"",
			"",
		],
	},
    {
		id: 7,
		name: "SIEC",
		logo: "https://gbdoqxdldyszmfzqzmuk.supabase.co/storage/v1/object/public/fasercon/images/clients/siec.png",
		works: [
			"",
			"",
		],
	},
];

export default function ClientsPage() {
	const [backgroundImage, setBackgroundImage] = useState("");
	const [nextBackgroundImage, setNextBackgroundImage] = useState("");
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [, setSelectedClient] = useState(clients[0]);
	const trackRef = useRef<HTMLDivElement | null>(null);
	const [copyReady, setCopyReady] = useState(false);
	const [trackWidth, setTrackWidth] = useState(0);

	// Función para obtener una imagen aleatoria válida
	const getRandomValidImage = () => {
		const clientsWithImages = clients.filter(
			client => client.works.some(image => image && image.trim() !== "")
		);
		
		if (clientsWithImages.length === 0) return "";
		
		const randomClient = clientsWithImages[Math.floor(Math.random() * clientsWithImages.length)];
		const validImages = randomClient.works.filter(img => img && img.trim() !== "");
		return validImages[Math.floor(Math.random() * validImages.length)] || "";
	};

	// Inicializar con imagen aleatoria y cambiar cada 5 segundos con transición
	useEffect(() => {
		const firstImage = getRandomValidImage();
		setBackgroundImage(firstImage);
		
		const interval = setInterval(() => {
			const newImage = getRandomValidImage();
			setNextBackgroundImage(newImage);
			setIsTransitioning(true);
			
			// Después de 1 segundo (duración del fade), actualizar la imagen principal
			setTimeout(() => {
				setBackgroundImage(newImage);
				setIsTransitioning(false);
			}, 1000);
		}, 5000);

		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		// Cuando las imágenes/logos cargan, permitimos la animación (para tener medidas correctas)
		const t = setTimeout(() => setCopyReady(true), 50);
		return () => clearTimeout(t);
	}, []);

	// Medir ancho del track (una sola copia) y actualizar variable CSS
	useEffect(() => {
		function measure() {
			if (!trackRef.current) return;
			// Triplicamos los logos, así el ancho total es 3x
			const full = trackRef.current.scrollWidth;
			const single = Math.floor(full / 3); // Dividir por 3 porque triplicamos
			setTrackWidth(single);
			// set CSS var for animation end value in px (negative)
			trackRef.current.style.setProperty('--marquee-end', `-${single}px`);
			// duration proportional to width (so speed feels consistent)
			const dur = Math.max(15, Math.round(single / 40));
			trackRef.current.style.setProperty('--marquee-duration', `${dur}s`);
		}
		if (copyReady) measure();
		window.addEventListener('resize', measure);
		return () => window.removeEventListener('resize', measure);
	}, [copyReady]);

	return (
		<>
			<Navbar />
			<main className="relative w-full min-h-screen">
				<div className="absolute inset-0">
					{/* Imagen de fondo principal */}
					{backgroundImage && (
							<Image src={backgroundImage} alt="Imagen de fondo" fill className="w-full h-full object-cover transition-opacity duration-1000" style={{ objectFit: 'cover', opacity: isTransitioning ? 0 : 1 }} />
						)}
					{/* Imagen de fondo siguiente (para crossfade) */}
						{isTransitioning && nextBackgroundImage && (
						<Image src={nextBackgroundImage} alt="Imagen de fondo siguiente" fill className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000" style={{ objectFit: 'cover', opacity: 1 }} />
					)}
				{/* Black transparent overlay */}
				<div className="absolute inset-0 bg-black/60" />
			</div>

			{/* Heading above the logos bar */}
			<div className="absolute left-0 right-0 top-[73%] transform -translate-y-1/2 z-30 flex justify-center">
				<h1 className="text-4xl md:text-6xl font-normal text-white/50 text-center">
					Nuestros Clientes
				</h1>
			</div>

			{/* Logos bar: centered vertically in the body, reduced height, continuous marquee */}
			<div
				className="absolute left-0 right-0 top-[85%] transform -translate-y-1/2 z-20 px-6 bg-white/80"
				style={{ boxShadow: 'inset 0 -18px 30px -18px rgba(0,0,0,0.35)' }}
			>
					{/* marquee container with edge fade mask so logos gently appear/disappear */}
					<div className="overflow-hidden w-full marquee-mask">
						<div
							ref={trackRef}
							className={`flex items-center gap-4 ${copyReady ? 'animate-marquee' : ''}`}
							style={
								{
									// CSS vars used by marquee keyframes
									// eslint-disable-next-line @typescript-eslint/ban-ts-comment
									// @ts-ignore
									'--marquee-end': trackWidth ? `-${trackWidth}px` : undefined,
									'--marquee-duration': trackWidth ? undefined : undefined,
								} as React.CSSProperties
							}
						>
							{[...clients, ...clients, ...clients].map((client, index) => (
								<button
									key={`${client.id}-${index}`}
									onClick={() => setSelectedClient(client)}
									className="shrink-0 inline-flex flex-col items-center px-6 py-1 transition-transform transform-gpu hover:scale-105"
								>
									<div className="relative w-28 h-28 mb-1">
										<Image src={client.logo} alt={client.name} fill className="object-contain" sizes="112px" />
									</div>
								</button>
							))}
						</div>
					</div>
				</div>
			</main>
			<Footer />
		</>
	);
}