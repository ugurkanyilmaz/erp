namespace KetenErp.Core.Service
{
    public class ServiceItem
    {
        public int Id { get; set; }
        public int ServiceOperationId { get; set; }
        public ServiceOperation? ServiceOperation { get; set; }

        public string? Name { get; set; }
        public decimal Price { get; set; }
        // Yeni alanlar (nullable): liste fiyatı ve indirim yüzdesi
        public decimal? ListPrice { get; set; }
        public decimal? DiscountPercent { get; set; }
    }
}
