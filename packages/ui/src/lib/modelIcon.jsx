import {
  User, Users, UserCheck, UserCog,
  ShoppingCart, ShoppingBag, Package, PackageOpen, PackageSearch,
  Tag, Tags, Layers, Folder, FolderOpen,
  DollarSign, CreditCard, Wallet, Receipt, Banknote, PiggyBank,
  Building, Building2, Hotel, Home, MapPin, Landmark,
  Settings, SlidersHorizontal, Wrench, Cog,
  FileText, File, BookOpen, BookMarked, Newspaper, ScrollText,
  LayoutDashboard, LayoutGrid, Table2,
  Calendar, CalendarDays, Clock, Timer,
  Truck, Car, Plane,
  Image, Images, Video, Music,
  Mail, MessageSquare, Bell, Phone,
  Shield, Lock, Key,
  BarChart2, PieChart, TrendingUp, Activity,
  Star, Heart, Award,
  Cpu, Database, Server, Globe, Wifi,
  Scissors, ShoppingBasket,
  Utensils, UtensilsCrossed, Coffee, Wine, Beer,
  Leaf,
  Boxes, Archive, Warehouse,
  ClipboardList, ClipboardCheck,
  ChefHat, Bed, Bath, Dumbbell, Waves,
} from 'lucide-react'

const ICON_MAP = {
  // Personnes
  user:         User,          admin:        UserCog,       staff:        UserCheck,
  employee:     UserCheck,     member:       User,          customer:     Users,
  client:       Users,         contact:      User,          guest:        User,
  stylist:      Scissors,      agent:        UserCheck,

  // Commandes / ventes
  order:        ShoppingCart,  sale:         ShoppingBag,   invoice:      Receipt,
  purchase:     ShoppingBag,   booking:      CalendarDays,  ticket:       Receipt,
  reservation:  CalendarDays,  cart:         ShoppingCart,  checkout:     CreditCard,
  checkin:      Bed,

  // Produits / stock
  product:      Package,       item:         PackageOpen,   inventory:    Warehouse,
  stock:        Boxes,         sku:          PackageSearch, supply:       Archive,
  ingredient:   Leaf,          recipe:       ChefHat,       menu:         ScrollText,
  drink:        Wine,          beverage:     Coffee,        beer:         Beer,
  dish:         Utensils,      food:         UtensilsCrossed,

  // Catégories / classification
  category:     Tag,           tag:          Tags,          label:        Tag,
  type:         Layers,        group:        Folder,        section:      FolderOpen,

  // Finance
  payment:      CreditCard,    transaction:  Banknote,      wallet:       Wallet,
  account:      PiggyBank,     budget:       DollarSign,    expense:      Receipt,
  treasury:     Landmark,      tax:          DollarSign,    price:        DollarSign,
  closure:      ClipboardCheck,

  // Lieux / hébergement
  room:         Bed,           hotel:        Hotel,         property:     Building2,
  building:     Building,      tenant:       Building2,     location:     MapPin,
  branch:       Landmark,      address:      MapPin,        pool:         Waves,
  salon:        Scissors,      spa:          Bath,          gym:          Dumbbell,

  // Config / système
  setting:      Settings,      config:       SlidersHorizontal, option:   Cog,
  preference:   Wrench,        permission:   Shield,        role:         Key,
  policy:       Lock,

  // Documents / contenu
  post:         FileText,      article:      Newspaper,     page:         File,
  content:      BookOpen,      blog:         BookMarked,    document:     ScrollText,
  report:       BarChart2,     log:          ClipboardList, note:         FileText,

  // Médias
  image:        Image,         photo:        Images,        video:        Video,
  media:        Images,        audio:        Music,         file:         File,

  // Communication
  message:      MessageSquare, email:        Mail,          notification: Bell,
  comment:      MessageSquare, review:       Star,          phone:        Phone,

  // Analytique
  stat:         Activity,      metric:       TrendingUp,    analytics:    PieChart,
  chart:        BarChart2,     dashboard:    LayoutDashboard,

  // Transport / logistique
  delivery:     Truck,         shipping:     Truck,         vehicle:      Car,
  flight:       Plane,         supplier:     Truck,

  // Tech
  server:       Server,        database:     Database,      api:          Globe,
  device:       Cpu,           network:      Wifi,

  // Commerce
  store:        ShoppingBag,   shop:         ShoppingBag,   market:       ShoppingBasket,
  event:        Calendar,      session:      Clock,         appointment:  CalendarDays,
  brand:        Award,         company:      Building2,     award:        Award,
  rating:       Star,          favorite:     Heart,
}

// Résout camelCase → premier mot-clé matché → clé string
export function modelIconKey(modelName) {
  const words = modelName.replace(/([A-Z])/g, ' $1').trim().toLowerCase().split(' ')
  for (const word of words) {
    if (ICON_MAP[word]) return word
  }
  return null
}

// Composant direct — size et couleur configurables via props
export function ModelIcon({ name, size = 16, strokeWidth = 1.8, ...props }) {
  const key  = modelIconKey(name)
  const Comp = (key && ICON_MAP[key]) ?? Table2
  return <Comp size={size} strokeWidth={strokeWidth} {...props} />
}
