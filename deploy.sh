#!/bin/bash
# Keten ERP - Docker Deployment Script (Linux/Mac)

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Keten ERP Docker Deployment ===${NC}"

# .env dosyası kontrolü
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env dosyası bulunamadı!${NC}"
    echo -e "${YELLOW}📋 .env.example dosyasından .env oluşturuluyor...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env dosyası oluşturuldu. Lütfen şifreleri düzenleyin!${NC}"
    echo ""
    echo -e "${BLUE}Düzenlenecek değerler:${NC}"
    echo -e "  - POSTGRES_PASSWORD"
    echo -e "  - JWT_SECRET_KEY"
    echo ""
    
    read -p "Devam etmek istiyor musunuz? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}İşlem iptal edildi.${NC}"
        exit 1
    fi
fi

# Parametre kontrolü
case "$1" in
    down)
        echo -e "${YELLOW}🛑 Container'lar durduruluyor ve siliniyor...${NC}"
        docker-compose down
        echo -e "${GREEN}✅ Tamamlandı!${NC}"
        exit 0
        ;;
    restart)
        echo -e "${YELLOW}🔄 Container'lar yeniden başlatılıyor...${NC}"
        docker-compose restart
        echo -e "${GREEN}✅ Tamamlandı!${NC}"
        exit 0
        ;;
    reset)
        echo -e "${RED}⚠️  DİKKAT: Bu işlem veritabanı dahil TÜM VERİLERİ SİLECEK!${NC}"
        echo -e "${RED}⚠️  Volume'ler silinecek: postgres_data, uploads_data, caddy_data...${NC}"
        read -p "Emin misiniz? (yes yazın) " -r
        echo
        if [[ $REPLY == "yes" ]]; then
            echo -e "${RED}🗑️  Tüm veriler siliniyor...${NC}"
            docker-compose down -v
            echo -e "${GREEN}✅ Temizlik tamamlandı. Şimdi './deploy.sh' ile yeniden başlatabilirsiniz.${NC}"
            exit 0
        else
            echo -e "${YELLOW}İşlem iptal edildi.${NC}"
            exit 0
        fi
        ;;
    logs)
        echo -e "${BLUE}📋 Docker logları gösteriliyor (Çıkmak için Ctrl+C)...${NC}"
        docker-compose logs -f
        exit 0
        ;;
    build)
        echo -e "${BLUE}🏗️  Proje yeniden build ediliyor...${NC}"
        docker-compose up -d --build
        ;;
    *)
        echo -e "${BLUE}🏗️  Proje başlatılıyor...${NC}"
        docker-compose up -d
        ;;
esac

echo ""
echo -e "${GREEN}✅ Deployment başarılı!${NC}"
echo ""
echo -e "${BLUE}📍 Uygulama erişim bilgileri:${NC}"
echo "   Frontend:   http://localhost"
echo "   API:        http://localhost:5000"
#!/bin/bash
# Keten ERP - Docker Deployment Script (Linux/Mac)

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Keten ERP Docker Deployment ===${NC}"

# .env dosyası kontrolü
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env dosyası bulunamadı!${NC}"
    echo -e "${YELLOW}📋 .env.example dosyasından .env oluşturuluyor...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env dosyası oluşturuldu. Lütfen şifreleri düzenleyin!${NC}"
    echo ""
    echo -e "${BLUE}Düzenlenecek değerler:${NC}"
    echo -e "  - POSTGRES_PASSWORD"
    echo -e "  - JWT_SECRET_KEY"
    echo ""
    
    read -p "Devam etmek istiyor musunuz? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}İşlem iptal edildi.${NC}"
        exit 1
    fi
fi

# Parametre kontrolü
case "$1" in
    down)
        echo -e "${YELLOW}🛑 Container'lar durduruluyor ve siliniyor...${NC}"
        docker-compose down
        echo -e "${GREEN}✅ Tamamlandı!${NC}"
        exit 0
        ;;
    restart)
        echo -e "${YELLOW}🔄 Container'lar yeniden başlatılıyor...${NC}"
        docker-compose restart
        echo -e "${GREEN}✅ Tamamlandı!${NC}"
        exit 0
        ;;
    reset)
        echo -e "${RED}⚠️  DİKKAT: Bu işlem veritabanı dahil TÜM VERİLERİ SİLECEK!${NC}"
        echo -e "${RED}⚠️  Volume'ler silinecek: postgres_data, uploads_data, caddy_data...${NC}"
        read -p "Emin misiniz? (yes yazın) " -r
        echo
        if [[ $REPLY == "yes" ]]; then
            echo -e "${RED}🗑️  Tüm veriler siliniyor...${NC}"
            docker-compose down -v
            echo -e "${GREEN}✅ Temizlik tamamlandı. Şimdi './deploy.sh' ile yeniden başlatabilirsiniz.${NC}"
            exit 0
        else
            echo -e "${YELLOW}İşlem iptal edildi.${NC}"
            exit 0
        fi
        ;;
    logs)
        echo -e "${BLUE}📋 Docker logları gösteriliyor (Çıkmak için Ctrl+C)...${NC}"
        docker-compose logs -f
        exit 0
        ;;
    build)
        echo -e "${BLUE}🏗️  Proje yeniden build ediliyor...${NC}"
        docker-compose up -d --build
        ;;
    *)
        echo -e "${BLUE}🏗️  Proje başlatılıyor...${NC}"
        docker-compose up -d
        ;;
esac

echo ""
echo -e "${GREEN}✅ Deployment başarılı!${NC}"
echo ""
echo -e "${BLUE}📍 Uygulama erişim bilgileri:${NC}"
echo "   Frontend:   http://localhost"
echo "   API:        http://localhost:5000"
echo "   Swagger:    http://localhost:5000/swagger"
echo "   PostgreSQL: localhost:5432"
echo ""
echo -e "${BLUE}📋 Kullanışlı komutlar:${NC}"
echo "   Logları göster:      ./deploy.sh logs"
echo "   Yeniden başlat:      ./deploy.sh restart"
echo "   Durdur ve sil:       ./deploy.sh down"
echo "   HER ŞEYİ SİL:        ./deploy.sh reset"
echo "   Yeniden build:       ./deploy.sh build"
echo ""
