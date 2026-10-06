import type { Metadata } from "next";
import {jsonLd,siteUrl} from "@/lib/seo";
import Home from "@/components/community/home";
export const metadata: Metadata = {
 title: "Clean Bathrooms in Las Vegas | PEEVUE",
 description: "Find clean bathrooms in Las Vegas with community cleanliness reviews, restroom photos, locations, and access details. Compare bathrooms by property and floor.",
 alternates: {canonical:"https://peevue.com/"},
};
export default function Page(){return <><Home/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd({"@context":"https://schema.org","@type":"WebSite",name:"PEEVUE",alternateName:"peevue.com",url:siteUrl,description:"Community bathroom cleanliness reviews in Las Vegas"})}}/></>;}
