exports.up = function(knex) {
  return knex.schema.createTable('rfqs', function(table) {
    table.uuid('id').primary();
    table.string('created_by').notNullable(); // User ID who created the RFQ
    table.string('government_entity').notNullable(); // Government department/entity
    table.string('title').notNullable();
    table.string('slug').unique().notNullable();
    table.text('description').notNullable();
    table.string('category').notNullable();
    table.string('subcategory');
    table.decimal('budget_min', 15, 2);
    table.decimal('budget_max', 15, 2);
    table.integer('timeline_days').notNullable();
    table.text('requirements');
    table.text('deliverables');
    table.text('evaluation_criteria');
    table.boolean('indigenous_only').defaultTo(false);
    table.timestamp('closing_date').notNullable();
    table.string('status').defaultTo('open'); // open, closed, cancelled
    table.string('close_reason');
    table.timestamp('closed_at');
    table.string('template_id'); // Reference to template if used
    table.timestamps(true, true);
    table.timestamp('deleted_at');

    // Indexes
    table.index(['category']);
    table.index(['status']);
    table.index(['closing_date']);
    table.index(['created_by']);
    table.index(['government_entity']);
    table.index(['indigenous_only']);
    table.index(['created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('rfqs');
};