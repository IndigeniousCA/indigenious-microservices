exports.up = function(knex) {
  return knex.schema.createTable('rfq_templates', function(table) {
    table.uuid('id').primary();
    table.string('created_by').notNullable(); // User ID who created the template
    table.string('name').notNullable();
    table.text('description');
    table.string('category').notNullable();
    table.jsonb('template_data').notNullable(); // Template structure and defaults
    table.boolean('is_public').defaultTo(false);
    table.integer('usage_count').defaultTo(0);
    table.timestamps(true, true);
    table.timestamp('deleted_at');

    // Indexes
    table.index(['category']);
    table.index(['is_public']);
    table.index(['created_by']);
    table.index(['usage_count']);
    table.index(['created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('rfq_templates');
};