namespace KetenErp.Core.Entities
{
    public class Product
    {
        public int Id { get; set; }
        // Optional SKU identifier for the product (e.g., PN-2024-004)
        public string? SKU { get; set; }
        public string? Name { get; set; }
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public int Stock { get; set; }
        // Minimum stock threshold used to mark critical stock levels
        public int MinStock { get; set; }
    }
}
