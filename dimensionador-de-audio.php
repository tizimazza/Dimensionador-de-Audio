<?php
/**
 * Plugin Name: Dimensionador de audio
 * Plugin URI: https://discabos.com.br
 * Description: Calculadora de dimensionamento de caixas acústicas, amplificadores e roteamento IP/Matriz.
 * Version: 1.0.12
 * Author: Discabos
 * Author URI: https://discabos.com.br
 * Text Domain: dimensionador-de-audio
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

// 1. Register the Admin Menu
add_action('admin_menu', 'workpro_audio_calculator_admin_menu');
function workpro_audio_calculator_admin_menu() {
    add_menu_page(
        'Dimensionador de audio',
        'Dimensionador de audio',
        'manage_options',
        'workpro-calculator',
        'workpro_audio_calculator_admin_page',
        'dashicons-calculator',
        100
    );
}

// 2. Output the root div for the React Admin App
function workpro_audio_calculator_admin_page() {
    echo '<div class="wrap"><div id="workpro-calc-admin-root"></div></div>';
}

// 3. Register Shortcode for the Frontend
add_shortcode('dimensionador_de_audio', 'dimensionador_de_audio_shortcode');
function dimensionador_de_audio_shortcode($atts) {
    workpro_calc_enqueue_react_app('frontend');
    return '<div id="workpro-calc-frontend-root"></div>';
}

// 4. Enqueue Scripts and Styles
add_action('admin_enqueue_scripts', 'workpro_calc_enqueue_admin_scripts');
function workpro_calc_enqueue_admin_scripts($hook) {
    if ($hook !== 'toplevel_page_workpro-calculator') {
        return;
    }
    workpro_calc_enqueue_react_app('admin');
}

function workpro_calc_enqueue_react_app($mode) {
    $plugin_dir = plugin_dir_path(__FILE__);
    $plugin_url = plugin_dir_url(__FILE__);
    $dist_path = $plugin_dir . 'dist/assets/';
    $dist_url  = $plugin_url . 'dist/assets/';

    $js_handle = 'workpro-calc-script'; // Fallback

    if (file_exists($dist_path)) {
        $files = scandir($dist_path);
        foreach ($files as $file) {
            if (pathinfo($file, PATHINFO_EXTENSION) === 'js') {
                $js_handle = 'workpro-calc-script-' . md5($file);
                wp_enqueue_script($js_handle, $dist_url . $file, [], '1.0.12', true);
            }
            if (pathinfo($file, PATHINFO_EXTENSION) === 'css') {
                wp_enqueue_style('workpro-calc-style-' . md5($file), $dist_url . $file, [], '1.0.12');
            }
        }
    }

    $default_skus = array(
      'spk_ceiling_amt5' => 'WORKPRO-AMT-5',
      'spk_ceiling_ic611' => 'WORKPRO-IC-611',
      'spk_ceiling_ic5kpro' => 'WORKPRO-IC-5K-PRO',
      'spk_wall_neo3' => 'WORKPRO-NEO-3',
      'spk_wall_neo5ip' => 'WORKPRO-NEO-5-IP',
      'spk_horn_sc615m' => 'TOA-SC-615M',
      'spk_horn_sc630m' => 'TOA-SC-630M',
      'amp_aml65' => 'WORKPRO-AML-65',
      'amp_aml120' => 'WORKPRO-AML-120',
      'amp_pm2404' => 'WORKPRO-PM-2404',
      'amp_pa4500' => 'WORKPRO-PA-4500',
      'acc_wpe44' => 'WORKPRO-WPE-44',
      'acc_integra8s' => 'WORKPRO-INTEGRA-8S',
      'acc_sps8' => 'WORKPRO-SPS-8',
      'acc_dm115' => 'WORKPRO-DM-115',
      'acc_dm1n' => 'WORKPRO-DM-1-N',
      'acc_bls2' => 'WORKPRO-BLS-2',
      'acc_blssd' => 'WORKPRO-BLS-SD',
      'acc_blr2' => 'WORKPRO-BLR-2',
      'acc_blraplus' => 'WORKPRO-BLR-A-PLUS',
      'cable_2x1_50' => 'CABO-2X1.50',
      'cable_2x2_50' => 'CABO-2X2.50',
      'cable_2x4_00' => 'CABO-2X4.00',
      'cable_cat6' => 'CABO-CAT6'
    );
    
    $saved_skus = get_option('workpro_product_skus', array());
    $product_skus = wp_parse_args($saved_skus, $default_skus);
    
    $woo_products = array();

    // Tentar buscar os dados do WooCommerce se estiver ativo
    if (function_exists('wc_get_product_id_by_sku')) {
        foreach ($product_skus as $internal_id => $sku) {
            if (!empty($sku)) {
                $product_id = wc_get_product_id_by_sku((string) $sku);
                if ($product_id) {
                    $product = wc_get_product($product_id);
                    if ($product) {
                        $image_id = $product->get_image_id();
                        $image_url = $image_id ? wp_get_attachment_image_url($image_id, 'thumbnail') : '';
                        $woo_products[$internal_id] = array(
                            'id'    => $product_id,
                            'name'  => $product->get_name(),
                            'url'   => $product->get_permalink(),
                            'image' => $image_url,
                            'sku'   => $product->get_sku(),
                            'price' => $product->get_price_html()
                        );
                    }
                }
            }
        }
    }

    // Passar configurações salvas do WordPress para o React
    $settings = array(
        'copyEmail'   => get_option('workpro_copy_email', ''),
        'productSkus' => $product_skus,
        'wooProducts' => $woo_products,
        'colorPrimary' => get_option('workpro_color_primary', '#df1319'),
        'colorSecondary' => get_option('workpro_color_secondary', '#9ebf24'),
        'mode'        => $mode,
        'ajaxUrl'     => rest_url('workpro-calc/v1/')
    );

    // Na prática do React App local, usamos localStorage no Preview
    // mas no WP real o frontend consumiria essa variável global
    wp_localize_script($js_handle, 'workproCalcSettings', $settings);
}

// 5. REST API para salvar configurações do React App no painel Admin
add_action('rest_api_init', function () {
    register_rest_route('workpro-calc/v1', '/settings', array(
        'methods' => 'POST',
        'callback' => 'workpro_calc_save_settings',
        'permission_callback' => function () {
            return current_user_can('manage_options');
        }
    ));

    register_rest_route('workpro-calc/v1', '/settings', array(
        'methods' => 'GET',
        'callback' => 'workpro_calc_get_settings',
        'permission_callback' => function () {
            return current_user_can('manage_options');
        }
    ));

    register_rest_route('workpro-calc/v1', '/send-email', array(
        'methods' => 'POST',
        'callback' => 'workpro_calc_send_email',
        'permission_callback' => '__return_true'
    ));
});

function workpro_calc_save_settings($request) {
    $params = $request->get_json_params();
    
    if (isset($params['copyEmail'])) update_option('workpro_copy_email', sanitize_email($params['copyEmail']));
    if (isset($params['colorPrimary'])) update_option('workpro_color_primary', sanitize_hex_color($params['colorPrimary']));
    if (isset($params['colorSecondary'])) update_option('workpro_color_secondary', sanitize_hex_color($params['colorSecondary']));
    if (isset($params['productSkus']) && is_array($params['productSkus'])) {
        $clean_skus = array();
        foreach($params['productSkus'] as $k => $v) {
            $clean_skus[sanitize_text_field($k)] = sanitize_text_field($v);
        }
        update_option('workpro_product_skus', $clean_skus);
    }
    
    return rest_ensure_response(array('success' => true));
}

function workpro_calc_get_settings() {
    return rest_ensure_response(array(
        'copyEmail'   => get_option('workpro_copy_email', ''),
        'colorPrimary' => get_option('workpro_color_primary', '#df1319'),
        'colorSecondary' => get_option('workpro_color_secondary', '#9ebf24'),
        'productSkus' => get_option('workpro_product_skus', (object)array())
    ));
}

function workpro_calc_send_email($request) {
    $params = $request->get_json_params();
    $userEmail = sanitize_email($params['userEmail']);
    $htmlContent = isset($params['htmlContent']) ? $params['htmlContent'] : '';
    $imageBase64 = isset($params['imageBase64']) ? $params['imageBase64'] : '';

    if (empty($userEmail)) {
        return new WP_Error('no_email', 'Email do usuário não fornecido', array('status' => 400));
    }

    $attachments = array();
    $temp_file = '';

    // Handle Image Attachment
    if (!empty($imageBase64)) {
        $image_parts = explode(";base64,", $imageBase64);
        if (count($image_parts) == 2) {
            $image_type_aux = explode("image/", $image_parts[0]);
            if (isset($image_type_aux[1])) {
                $image_type = $image_type_aux[1];
                $image_base64 = base64_decode($image_parts[1]);
                $upload_dir = wp_upload_dir();
                $temp_file = $upload_dir['path'] . '/diagrama-projeto-' . time() . '.' . $image_type;
                file_put_contents($temp_file, $image_base64);
                $attachments[] = $temp_file;
            }
        }
    }

    $copyEmail = get_option('workpro_copy_email', '');
    $to = $userEmail;
    if (!empty($copyEmail)) {
        $to .= ',' . $copyEmail;
    }

    $subject = 'Seu Dimensionamento de Sonorização - Discabos';
    
    $headers = array('Content-Type: text/html; charset=UTF-8');

    $logoUrl = get_site_icon_url();
    if (!$logoUrl && function_exists('get_custom_logo')) {
        $custom_logo_id = get_theme_mod('custom_logo');
        $logo_image = wp_get_attachment_image_src($custom_logo_id, 'full');
        if (!empty($logo_image[0])) {
            $logoUrl = $logo_image[0];
        }
    }

    $headerHtml = '';
    if (!empty($logoUrl)) {
        $headerHtml = '<div style="text-align:center; margin-bottom: 20px;"><img src="' . esc_url($logoUrl) . '" alt="Logo" style="max-height: 80px;" /></div>';
    }

    $footerHtml = '
        <br/><br/>
        <hr style="border: 0; border-top: 1px solid #ccc; margin: 20px 0;"/>
        <div style="color: #666; font-size: 12px; font-family: sans-serif;">
            <p style="margin: 0;"><strong>Grupo Discabos</strong></p>
            <p style="margin: 0;">11 4138-8373</p>
            <p style="margin: 0;"><a href="mailto:vendas@discabos.com.br" style="color: #DF1319;">vendas@discabos.com.br</a></p>
        </div>
    ';

    // Se a imagem não for anexo, poderíamos usar CID, mas anexar é mais seguro.
    $body = '<html><body style="font-family: sans-serif; color: #333; line-height: 1.5; padding: 20px;">' . $headerHtml . wp_kses_post($htmlContent) . '<br/><p>Enviamos em anexo o diagrama/mapa do seu projeto.</p>' . $footerHtml . '</body></html>';

    $sent = wp_mail($to, $subject, $body, $headers, $attachments);

    if ($temp_file && file_exists($temp_file)) {
        unlink($temp_file);
    }

    if ($sent) {
        return rest_ensure_response(array('success' => true));
    } else {
        return new WP_Error('mail_failed', 'Falha ao enviar e-mail', array('status' => 500));
    }
}
