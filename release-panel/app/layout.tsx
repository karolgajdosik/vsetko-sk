import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"VŠETKO24.sk · Kontrola vydania",description:"Produkčné kontroly, história a pripravenosť vydania 3.0.",icons:{icon:"/favicon.svg"}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="sk"><body>{children}</body></html>}
