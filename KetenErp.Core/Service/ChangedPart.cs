namespace KetenErp.Core.Service
{
    public class ChangedPart
    {
        public int Id { get; set; }
        public int ServiceOperationId { get; set; }
        public ServiceOperation? ServiceOperation { get; set; }

        public string? PartName { get; set; }
        public int Quantity { get; set; } = 1;
        // fiyatı muhasebe ekranında belirleyebilmek için eklendi
        public decimal Price { get; set; } = 0m;
    }
}
