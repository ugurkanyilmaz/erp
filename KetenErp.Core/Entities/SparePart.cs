namespace KetenErp.Core.Entities
{
    public class SparePart
    {
        public int Id { get; set; }
        public string? SKU { get; set; }
        public string? PartNumber { get; set; }
        public string? Title { get; set; }

        // Optional relation to Product
        public int? ProductId { get; set; }
        public Product? Product { get; set; }

        public int Stock { get; set; }
        public int MinStock { get; set; }
    }
}
